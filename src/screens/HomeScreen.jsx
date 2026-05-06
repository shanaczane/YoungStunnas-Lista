import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AppLogo from '../components/AppLogo'
import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import homeMascot from '../mascots/home-mascot.png'
import { parseTask } from '../lib/ai'
import { formatDueDate, getGreeting } from '../lib/utils'
import { BUILT_IN_CATEGORIES, getCategoryColor } from '../lib/categories'

export default function HomeScreen({
  session,
  displayName,
  tasks,
  categories,
  onTaskCreated,
  onNavigate,
  onOpenTask,
  focusChat,
  onFocusChatConsumed,
}) {
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [parseError, setParseError] = useState('')
  const inputRef = useRef(null)

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const upcoming = tasks.filter(t => {
    if (t.is_complete || !t.due_date) return false
    const d = new Date(t.due_date)
    return d <= new Date(tomorrow.toDateString() + ' 23:59:59')
  })

  const recent = tasks.slice(0, 5)

  useEffect(() => {
    if (focusChat) {
      inputRef.current?.focus()
      onFocusChatConsumed()
    }
  }, [focusChat, onFocusChatConsumed])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParseError('')
    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      setParseCard({ raw: trimmed, ...parsed })
    } catch {
      setParseError('Could not parse — tap to enter manually.')
      setParseCard({ raw: trimmed, task: trimmed, due_date: null, category: 'Personal', assignee: null })
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parseCard) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: session.user.id,
      content: parseCard.raw,
      task_name: parseCard.task,
      due_date: parseCard.due_date || null,
      category: parseCard.category || 'Personal',
      assignee: parseCard.assignee || null,
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
        notes: '',
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
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

      <div className="flex-1 overflow-y-auto pb-40">
        {tasks.length === 0 ? (
          <EmptyHome />
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="px-5 pt-5 mb-5">
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

            <section className="px-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Recent Tasks</p>
                {tasks.length > 5 && (
                  <button onClick={() => onNavigate('tasks')} className="text-accent-deep text-xs font-semibold">
                    View all →
                  </button>
                )}
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
                      {task.due_date && (
                        <p className="text-slate-400 text-xs mt-0.5">{formatDueDate(task.due_date)}</p>
                      )}
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

      {/* Bottom fixed area: parse card + chat input stacked */}
      <div className="fixed bottom-20 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="bg-white rounded-2xl p-4 card-elevated-lg animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-accent-deep text-[10px] font-bold uppercase tracking-widest">AI Parsed</span>
              {parseError && <p className="text-amber-500 text-[10px]">{parseError}</p>}
            </div>

            <div className="space-y-2.5 mb-3">
              <EditableRow
                label="Task"
                value={parseCard.task}
                onChange={v => handleEditField('task', v)}
              />
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1.5">Category</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {[...BUILT_IN_CATEGORIES, ...categories].map(cat => {
                    const isSelected = (parseCard.category || 'Personal') === cat.name
                    const catColors  = getCategoryColor(cat.name, categories)
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleEditField('category', cat.name)}
                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                          isSelected ? 'ring-2 ring-offset-1 scale-105' : 'opacity-55 hover:opacity-80'
                        }`}
                        style={{ backgroundColor: catColors.bg, color: catColors.text }}
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
                </div>
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
            className="w-8 h-8 rounded-full bg-accent-deep text-white flex items-center justify-center transition-colors disabled:opacity-40 active:bg-accent-mid shrink-0"
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
