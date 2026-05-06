import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AppLogo from '../components/AppLogo'
import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import homeMascot from '../mascots/home-mascot.png'
import { parseTask, parseImageList, detectChecklist, encodeChecklist, isChecklist, getChecklistItems, cleanInput } from '../lib/ai'
import { formatDueDate, getGreeting } from '../lib/utils'
import { BUILT_IN_CATEGORIES, getCategoryColor, createCategory } from '../lib/categories'

const PRESET_COLORS = ['#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#06B6D4','#6366F1']

export default function HomeScreen({
  session,
  displayName,
  tasks,
  categories,
  onTaskCreated,
  onNavigate,
  onOpenTask,
  onCategoriesChanged,
  focusChat,
  onFocusChatConsumed,
  pendingImage,
  onPendingImageConsumed,
}) {
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [parseError, setParseError] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [scanningImage, setScanningImage] = useState(false)
  const [scanError, setScanError] = useState('')
  const inputRef = useRef(null)
  const itemRefs = useRef([])

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const upcoming = tasks.filter(t => {
    if (t.is_complete || !t.due_date) return false
    const d = new Date(t.due_date)
    return d <= new Date(tomorrow.toDateString() + ' 23:59:59')
  })

  const SORT_MODES = ['recent', 'nearest', 'furthest']
  const SORT_LABELS = { recent: 'Recent', nearest: 'Nearest Due', furthest: 'Furthest Due' }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortMode === 'nearest') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (sortMode === 'furthest') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(b.due_date) - new Date(a.due_date)
    }
    return 0 // 'recent' keeps original order (already sorted by created_at desc)
  })

  const recent = sortedTasks.slice(0, 5)

  useEffect(() => {
    if (focusChat) {
      inputRef.current?.focus()
      onFocusChatConsumed()
    }
  }, [focusChat, onFocusChatConsumed])

  useEffect(() => {
    if (!pendingImage) return
    onPendingImageConsumed()
    setParseCard(null)
    setParseError('')
    setScanError('')
    setScanningImage(true)
    parseImageList(pendingImage)
      .then(text => {
        setScanningImage(false)
        if (!text) {
          setScanError('Could not read the image. Run: ollama pull llava')
          return
        }
        const checklist = detectChecklist(text)
        if (checklist) {
          setParseCard({
            raw: text,
            task: suggestListTitle(checklist.title, checklist.items),
            checklistTitle: checklist.title,
            due_date: null,
            category: 'Personal',
            assignee: null,
            checklistItems: checklist.items,
          })
        } else {
          setParseCard({ raw: text, task: text, due_date: null, category: 'Personal', assignee: null, notes: cleanInput(text) })
        }
      })
      .catch(() => {
        setScanningImage(false)
        setScanError('Scanning failed. Run: ollama pull llava')
      })
  }, [pendingImage])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParseError('')

    const checklist = detectChecklist(trimmed)
    if (checklist) {
      setParseCard({
        raw: trimmed,
        task: suggestListTitle(checklist.title, checklist.items),
        checklistTitle: checklist.title,
        due_date: null,
        category: 'Personal',
        assignee: null,
        checklistItems: checklist.items,
      })
      return
    }

    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      setParseCard({ raw: trimmed, ...parsed, notes: cleanInput(trimmed) })
    } catch {
      setParseError('Could not parse — tap to enter manually.')
      setParseCard({ raw: trimmed, task: trimmed, due_date: null, category: 'Personal', assignee: null, notes: cleanInput(trimmed) })
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parseCard) return
    const encodedNotes = parseCard.checklistItems
      ? encodeChecklist(parseCard.checklistItems, parseCard.checklistTitle ?? '')
      : (parseCard.notes || undefined)
    const { data, error } = await supabase.from('tasks').insert({
      user_id: session.user.id,
      content: parseCard.raw,
      task_name: parseCard.task,
      due_date: parseCard.due_date || null,
      category: parseCard.category || 'Personal',
      assignee: parseCard.assignee || null,
      ...(encodedNotes !== undefined ? { notes: encodedNotes } : {}),
    }).select().single()

    if (error) {
      console.warn('Supabase insert failed:', error.message)
      onTaskCreated({
        id: crypto.randomUUID(),
        user_id: session.user.id,
        space_id: null,
        content: parseCard.raw,
        task_name: parseCard.task,
        due_date: parseCard.due_date || null,
        category: parseCard.category || 'Personal',
        assignee: parseCard.assignee || null,
        notes: encodedNotes || '',
        reminder_minutes: null,
        is_complete: false,
        created_at: new Date().toISOString(),
      })
    } else {
      onTaskCreated(data)
    }

    setParseCard(null)
    setInput('')
    setParseError('')
  }

  function handleEditField(field, value) {
    setParseCard(prev => ({ ...prev, [field]: value }))
  }

  async function handleAddCategory() {
    const name = newCatInput.trim()
    if (!name) return
    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
    const { error } = await createCategory(session.user.id, { name, color, emoji: '📁' })
    if (!error) {
      handleEditField('category', name)
      onCategoriesChanged?.()
    }
    setAddingCategory(false)
    setNewCatInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">

      {/* Scanning overlay */}
      {scanningImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-base">Reading your list…</p>
        </div>
      )}

      {/* Scan error toast */}
      {scanError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-500 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError('')} className="ml-3 text-white/80 hover:text-white text-lg leading-none">✕</button>
        </div>
      )}

      {/* Top bar */}
      <ScreenHeader>
        <div className="flex items-center gap-3">
          <AppLogo size="md" />
          <div>
            <p className="text-slate-400 text-xs leading-none mb-0.5">{getGreeting()},</p>
            <h1 className="text-slate-900 font-bold text-lg leading-tight">{displayName.split(' ')[0]}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('notifications')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-accent-deep hover:bg-accent-pale transition-colors"
          >
            <BellIcon />
          </button>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto pb-52">
        {tasks.length === 0 ? (
          <EmptyHome />
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="px-5 pt-6 mb-6">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Due Soon</p>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {upcoming.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onOpenTask(task.id)}
                      className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 text-left min-w-[152px] card-elevated transition-all active:scale-95"
                    >
                      <div
                        className="w-6 h-1 rounded-full mb-2"
                        style={{ backgroundColor: getCategoryColor(task.category, categories)?.border }}
                      />
                      <p className="text-slate-800 text-xs font-semibold leading-snug line-clamp-2">{task.task_name}</p>
                      <p className="text-slate-400 text-[10px] mt-1.5">{formatDueDate(task.due_date)}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="px-5 pt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Recent Tasks</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(v => !v)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${showSortMenu || sortMode !== 'recent' ? 'bg-accent-deep text-white' : 'bg-slate-100 text-slate-400 hover:text-accent-deep'}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M7 12h10M11 18h2"/>
                      </svg>
                    </button>
                    {showSortMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                        <div className="absolute right-0 top-9 z-20 bg-white rounded-2xl shadow-xl border border-black/8 overflow-hidden min-w-[160px]">
                          {SORT_MODES.map(mode => (
                            <button
                              key={mode}
                              onClick={() => { setSortMode(mode); setShowSortMenu(false) }}
                              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors ${
                                sortMode === mode ? 'bg-accent-pale text-accent-deep font-semibold' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {sortMode === mode && (
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                              {sortMode !== mode && <span className="w-2.5" />}
                              {SORT_LABELS[mode]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {tasks.length > 5 && (
                    <button onClick={() => onNavigate('tasks')} className="text-accent-deep text-xs font-semibold">
                      View all →
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2.5">
                {recent.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask(task.id)}
                    className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 card-elevated transition-all active:scale-[0.99] text-left"
                  >
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(task.category, categories)?.border }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                        {task.task_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-slate-400 text-xs">
                          {task.due_date ? formatDueDate(task.due_date) : 'No due date'}
                        </p>
                        {isChecklist(task) && (() => {
                          const items = getChecklistItems(task) || []
                          const done = items.filter(it => it.done).length
                          return (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              ✓ {done}/{items.length}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: getCategoryColor(task.category, categories)?.bg, color: getCategoryColor(task.category, categories)?.text }}
                    >
                      {task.category}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Image scanning overlay */}
      {scanningImage && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm gap-4">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-base">Reading your list…</p>
        </div>
      )}

      {/* Scan error toast */}
      {scanError && !scanningImage && (
        <div className="fixed top-20 left-4 right-4 z-30 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-500 text-sm font-medium flex-1">{scanError}</p>
          <button onClick={() => setScanError('')} className="text-red-300 hover:text-red-500 ml-3 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Bottom fixed area: parse card + chat input stacked */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="bg-white rounded-2xl p-4 card-elevated-lg animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-accent-deep text-[10px] font-bold uppercase tracking-widest">AI Parsed</span>
              {parseError && <p className="text-amber-500 text-[10px]">{parseError}</p>}
            </div>

            <div className="space-y-2.5 mb-3">
              {parseCard.checklistItems ? (
                <div className="space-y-2">
                  {/* AI-suggested overall task name */}
                  <input
                    type="text"
                    value={parseCard.task}
                    onChange={e => handleEditField('task', e.target.value)}
                    className="w-full bg-transparent text-slate-900 text-xl font-bold outline-none border-b-2 border-slate-200 focus:border-accent-deep pb-1.5 transition-colors placeholder:text-slate-300"
                    placeholder="List title"
                  />
                  {/* Note card */}
                  <div className="bg-slate-50 border border-black/10 rounded-xl px-4 py-3">
                    <input
                      type="text"
                      value={parseCard.checklistTitle ?? parseCard.task}
                      onChange={e => handleEditField('checklistTitle', e.target.value)}
                      className="w-full bg-transparent text-slate-900 text-base font-bold outline-none mb-3 placeholder:text-slate-300"
                      placeholder="List title"
                    />
                    <div className="space-y-2.5">
                      {parseCard.checklistItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 group">
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                          <input
                            ref={el => { itemRefs.current[i] = el }}
                            type="text"
                            value={item.text}
                            onChange={e => {
                              const items = parseCard.checklistItems.map((it, j) => j === i ? { ...it, text: e.target.value } : it)
                              handleEditField('checklistItems', items)
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (!item.text.trim()) return
                                const items = [...parseCard.checklistItems]
                                items.splice(i + 1, 0, { text: '', done: false })
                                handleEditField('checklistItems', items)
                                setTimeout(() => itemRefs.current[i + 1]?.focus(), 0)
                              } else if (e.key === 'Backspace' && item.text === '') {
                                e.preventDefault()
                                if (parseCard.checklistItems.length > 1) {
                                  const items = parseCard.checklistItems.filter((_, j) => j !== i)
                                  handleEditField('checklistItems', items)
                                  setTimeout(() => itemRefs.current[Math.max(0, i - 1)]?.focus(), 0)
                                }
                              }
                            }}
                            placeholder={`Item ${i + 1}`}
                            className="flex-1 bg-transparent text-slate-700 text-sm outline-none placeholder:text-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditField('checklistItems', parseCard.checklistItems.filter((_, j) => j !== i))}
                            className="text-slate-200 hover:text-red-400 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >✕</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const next = parseCard.checklistItems.length
                          handleEditField('checklistItems', [...parseCard.checklistItems, { text: '', done: false }])
                          setTimeout(() => itemRefs.current[next]?.focus(), 0)
                        }}
                        className="flex items-center gap-3 text-slate-400 hover:text-accent-deep transition-colors mt-1"
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 text-xs">+</div>
                        <span className="text-sm">Add item</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={parseCard.task}
                    onChange={e => handleEditField('task', e.target.value)}
                    className="w-full bg-transparent text-slate-900 text-xl font-bold outline-none border-b-2 border-slate-200 focus:border-accent-deep pb-1.5 transition-colors placeholder:text-slate-300"
                    placeholder="Task name"
                  />
                  <textarea
                    value={parseCard.notes || ''}
                    onChange={e => handleEditField('notes', e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full bg-slate-50 border border-black/10 rounded-xl px-4 py-3 text-slate-700 text-sm outline-none resize-none placeholder:text-slate-300 focus:border-accent-deep transition-colors"
                  />
                </div>
              )}
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-2">Category</p>
                <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-hide">
                  {[...BUILT_IN_CATEGORIES, ...categories].map(cat => {
                    const isSelected = (parseCard.category || 'Personal') === cat.name
                    const catColors  = getCategoryColor(cat.name, categories)
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleEditField('category', cat.name)}
                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                          isSelected ? '' : 'opacity-55 hover:opacity-80'
                        }`}
                        style={{ backgroundColor: catColors.bg, color: catColors.text, ...(isSelected ? { outline: `2px solid ${catColors.border}`, outlineOffset: '2px' } : {}) }}
                      >
                        <span>{cat.emoji || '📁'}</span>
                        <span>{cat.name}</span>
                        {isSelected && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}

                  {/* Add category button */}
                  {!addingCategory && (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-accent-pale hover:text-accent-deep text-base font-medium transition-colors"
                    >
                      +
                    </button>
                  )}
                </div>

                {addingCategory && (
                  <div className="flex gap-1.5 items-center mt-2 animate-slide-up">
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                      placeholder="New category name..."
                      className="flex-1 bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 outline-none border border-black/10 focus:border-accent-deep"
                      autoFocus
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCatInput.trim()}
                      className="px-2.5 py-1.5 rounded-xl bg-accent-deep text-white text-xs font-bold disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingCategory(false); setNewCatInput('') }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1">Due Date</p>
                <input
                  type="datetime-local"
                  value={parseCard.due_date ? parseCard.due_date.slice(0, 16) : ''}
                  onChange={e => handleEditField('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-2 outline-none border border-black/10 focus:border-accent-deep"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setParseCard(null); setParseError('') }}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-slate-500 text-sm font-medium hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-accent-deep text-white text-sm font-bold transition-colors active:bg-accent-mid"
              >
                Save Task
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 card-elevated">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type anything... "finish report by Friday"'
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full bg-accent-deep flex items-center justify-center transition-colors disabled:opacity-40 active:bg-accent-mid flex-shrink-0"
          >
            {parsing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function suggestListTitle(title, items) {
  const combined = (title + ' ' + items.map(i => i.text).join(' ')).toLowerCase()
  if (/grocery|grocer|garlic|onion|tomato|vegetable|fruit|market|buy|shop|supermarket/.test(combined)) return 'Grocery List'
  if (/pencil|eraser|notebook|pen|highlighter|ballpen|supplies/.test(combined)) return 'School Supplies'
  if (/pack|luggage|travel|trip|suitcase/.test(combined)) return 'Packing List'
  if (/medicine|pill|drug|vitamin|tablet/.test(combined)) return 'Medicine List'
  if (/book|read|library|novel/.test(combined)) return 'Reading List'
  if (/todo|task|things to do|checklist/.test(combined)) return 'To-Do List'
  if (/ingredi|recipe|cook|bake/.test(combined)) return 'Ingredients'
  const t = title.trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function EditableRow({ label, value, onChange }) {
  return (
    <div>
      <p className="text-slate-400 text-[10px] mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2 outline-none border border-black/10 focus:border-accent-deep"
      />
    </div>
  )
}

function EmptyHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
      <img src={homeMascot} alt="Lista" className="w-36 h-36 object-contain mb-2" style={{ mixBlendMode: 'multiply' }} />
      <p className="text-slate-800 font-semibold text-lg">Type your first task</p>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
        Just type naturally below — Lista will organize it for you automatically.
      </p>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  )
}
