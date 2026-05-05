import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProfileAvatar from '../components/ProfileAvatar'
import { formatDueDate, getDateGroup } from '../lib/utils'
import {
  BUILT_IN_CATEGORIES,
  getCategoryColor,
  getCategoryEmoji,
  createCategory,
} from '../lib/categories'
import { parseTask } from '../lib/ai'
import mascot from '../mascots/home-mascot.png'

const DATE_GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'Done']

const EMOJI_OPTIONS = [
  '📚','💼','🏃','🛒','💪','🎯','🏠','✈️','🎨','💡',
  '🔬','🎓','💻','🌱','🎵','⚽','🍎','📝','💰','🌟',
  '🧘','🎮','🚀','❤️','🧪',
]

const COLOR_OPTIONS = [
  '#a855f7','#f97316','#22c55e','#ec4899',
  '#ef4444','#eab308','#14b8a6','#6366f1',
  '#f43f5e','#0ea5e9','#84cc16','#f59e0b',
]

export default function TasksScreen({
  tasks, onTaskUpdated, onOpenTask, onNavigate,
  session, displayName, categories, onCategoriesChanged, onTaskCreated,
}) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [collapsed, setCollapsed]           = useState({})
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [input, setInput]       = useState('')
  const [parsing, setParsing]   = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [parseError, setParseError] = useState('')
  const inputRef = useRef(null)

  const allCategories = [...BUILT_IN_CATEGORIES, ...categories]

  // ── Folder view ────────────────────────────────────────────────────────────
  if (!activeCategory) {
    const folders = allCategories.map(cat => ({
      ...cat,
      taskCount: tasks.filter(t => t.category === cat.name).length,
    }))

    const withTasks    = folders.filter(f => f.taskCount > 0)
    const emptyCustom  = categories.filter(c => !withTasks.find(f => f.name === c.name))

    return (
      <div className="flex flex-col min-h-screen bg-app-bg">
        <header className="flex items-center justify-between px-5 pt-6 pb-4 bg-white border-b border-black/6">
          <div>
            <h1 className="text-slate-900 font-bold text-2xl">My Tasks</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {tasks.filter(t => !t.is_complete).length} pending
            </p>
          </div>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
          <div className="space-y-3">
            {/* Folders with tasks */}
            {withTasks.map(folder => {
              const colors = getCategoryColor(folder.name, categories)
              const emoji  = getCategoryEmoji(folder.name, categories)
              return (
                <button
                  key={folder.name}
                  onClick={() => setActiveCategory(folder)}
                  className="w-full bg-white rounded-2xl p-4 card-elevated flex items-center gap-4 transition-all active:scale-[0.99] text-left"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.border }} />
                      <p className="text-slate-900 font-bold text-base truncate">{folder.name}</p>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 ml-4">
                      {folder.taskCount} task{folder.taskCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200 flex-shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )
            })}

            {/* Empty custom categories */}
            {emptyCustom.map(cat => {
              const colors = getCategoryColor(cat.name, categories)
              const emoji  = getCategoryEmoji(cat.name, categories)
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat)}
                  className="w-full bg-white/60 rounded-2xl p-4 border border-dashed border-slate-200 flex items-center gap-4 transition-all active:scale-[0.99] text-left"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 opacity-50"
                    style={{ backgroundColor: colors.bg }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 font-bold text-base">{cat.name}</p>
                    <p className="text-slate-300 text-xs mt-0.5">No tasks yet</p>
                  </div>
                </button>
              )
            })}

            {/* Empty state message when no tasks at all */}
            {withTasks.length === 0 && emptyCustom.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <img src={mascot} alt="" className="w-24 h-24 object-contain mb-3 opacity-60" style={{ mixBlendMode: 'multiply' }} />
                <p className="text-slate-400 text-sm font-medium">No tasks yet</p>
                <p className="text-slate-300 text-xs mt-1">Add tasks from Home, or create a category below</p>
              </div>
            )}

            {/* New Category card — always visible */}
            <button
              onClick={() => setShowNewCategory(true)}
              className="w-full bg-transparent border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.99] hover:border-accent-deep/30"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-slate-400 font-semibold text-sm">New Category</p>
                <p className="text-slate-300 text-xs">Customize with emoji &amp; color</p>
              </div>
            </button>
          </div>
        </div>

        {showNewCategory && (
          <NewCategoryModal
            session={session}
            onCreated={() => { setShowNewCategory(false); onCategoriesChanged() }}
            onCancel={() => setShowNewCategory(false)}
          />
        )}
      </div>
    )
  }

  // ── Category detail: derived values ─────────────────────────────────────────
  const catTasks = activeCategory ? tasks.filter(t => t.category === activeCategory.name) : []
  const grouped  = {}
  for (const task of catTasks) {
    const group = task.is_complete ? 'Done' : getDateGroup(task.due_date)
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(task)
  }
  const colors = getCategoryColor(activeCategory?.name, categories)
  const emoji  = getCategoryEmoji(activeCategory?.name, categories)

  // ── Category detail: task creation handlers ──────────────────────────────
  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParseError('')
    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      // Pre-lock to the active category
      setParseCard({ raw: trimmed, ...parsed, category: activeCategory?.name || parsed.category })
    } catch {
      setParseError('Could not parse — edit manually.')
      setParseCard({ raw: trimmed, task: trimmed, due_date: null, category: activeCategory?.name || 'Personal', assignee: null })
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parseCard) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id:   session.user.id,
      content:   parseCard.raw,
      task_name: parseCard.task,
      due_date:  parseCard.due_date || null,
      category:  parseCard.category || activeCategory?.name || 'Personal',
      assignee:  parseCard.assignee || null,
    }).select().single()
    if (!error && data) onTaskCreated?.(data)
    else if (error) {
      // Optimistic fallback
      onTaskCreated?.({
        id: crypto.randomUUID(), user_id: session.user.id, space_id: null,
        content: parseCard.raw, task_name: parseCard.task,
        due_date: parseCard.due_date || null, category: parseCard.category || 'Personal',
        assignee: parseCard.assignee || null, is_complete: false,
        created_at: new Date().toISOString(),
      })
    }
    setParseCard(null)
    setInput('')
    setParseError('')
  }

  function handleEditCatField(field, value) {
    setParseCard(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <header className="px-5 pt-6 pb-4 bg-white border-b border-black/6">
        <button
          onClick={() => { setActiveCategory(null); setParseCard(null); setInput('') }}
          className="flex items-center gap-1.5 text-accent-deep text-sm mb-3 font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          All Categories
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: colors.bg }}
            >
              {emoji}
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-xl">{activeCategory.name}</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {catTasks.filter(t => !t.is_complete).length} pending · {catTasks.filter(t => t.is_complete).length} done
              </p>
            </div>
          </div>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
        <div className="h-0.5 rounded-full mt-3 opacity-30" style={{ backgroundColor: colors.border }} />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-44 pt-4 space-y-6">
        {catTasks.length === 0 ? (
          <EmptyCategory />
        ) : (
          DATE_GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <section key={group}>
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))}
                className="flex items-center gap-2 w-full mb-3"
              >
                <span className={`text-[11px] font-bold uppercase tracking-widest ${
                  group === 'Overdue' ? 'text-red-500' :
                  group === 'Today'   ? 'text-accent-deep' :
                  group === 'Done'    ? 'text-slate-300' : 'text-slate-400'
                }`}>{group}</span>
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {grouped[group].length}
                </span>
                <span className="ml-auto text-slate-300 text-xs">{collapsed[group] ? '›' : '‹'}</span>
              </button>
              {!collapsed[group] && (
                <div className="space-y-2.5">
                  {grouped[group].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colors={colors}
                      onToggle={() => onTaskUpdated(task.id, { is_complete: !task.is_complete })}
                      onOpen={() => onOpenTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      {/* Bottom fixed area: parse card + chat input */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="bg-white rounded-2xl p-4 card-elevated-lg animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.text }}>AI Parsed · {activeCategory.name}</span>
              {parseError && <p className="text-amber-500 text-[10px]">{parseError}</p>}
            </div>
            <div className="space-y-2.5 mb-3">
              {/* Task name */}
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1">Task</p>
                <input
                  type="text"
                  value={parseCard.task}
                  onChange={e => handleEditCatField('task', e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2 outline-none border border-black/10 focus:border-accent-deep"
                />
              </div>
              {/* Category pills */}
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1.5">Category</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {[...BUILT_IN_CATEGORIES, ...categories].map(cat => {
                    const isSel = parseCard.category === cat.name
                    const cc    = getCategoryColor(cat.name, categories)
                    const ce    = getCategoryEmoji(cat.name, categories)
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleEditCatField('category', cat.name)}
                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                          isSel ? 'ring-2 ring-offset-1 scale-105' : 'opacity-50 hover:opacity-80'
                        }`}
                        style={{ backgroundColor: cc.bg, color: cc.text }}
                      >
                        <span>{ce}</span>
                        <span>{cat.name}</span>
                        {isSel && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Due date */}
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1">Due Date</p>
                <input
                  type="datetime-local"
                  value={parseCard.due_date ? parseCard.due_date.slice(0, 16) : ''}
                  onChange={e => handleEditCatField('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-2 outline-none border border-black/10 focus:border-accent-deep"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setParseCard(null); setParseError('') }}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors active:opacity-90"
                style={{ backgroundColor: colors.border }}
              >
                Add to {activeCategory.name}
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
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
            placeholder={`Add a task to ${activeCategory?.name ?? 'this category'}…`}
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 active:opacity-80 flex-shrink-0"
            style={{ backgroundColor: colors.border }}
          >
            {parsing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TaskCard({ task, colors, onToggle, onOpen }) {
  return (
    <div className="bg-white rounded-2xl flex items-center card-elevated transition-all overflow-hidden active:scale-[0.99]">
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />
      <button onClick={onToggle} className="w-11 h-11 flex items-center justify-center flex-shrink-0">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.is_complete ? 'bg-accent-deep border-accent-deep' : 'border-slate-300'
        }`}>
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </button>
      <button onClick={onOpen} className="flex-1 py-3.5 pr-3 text-left min-w-0">
        <p className={`text-sm font-semibold leading-tight truncate ${
          task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'
        }`}>
          {task.task_name}
        </p>
        {task.due_date && (
          <p className={`text-xs mt-0.5 ${
            getDateGroup(task.due_date) === 'Overdue' && !task.is_complete ? 'text-red-500' : 'text-slate-400'
          }`}>
            {formatDueDate(task.due_date)}
          </p>
        )}
      </button>
    </div>
  )
}

function NewCategoryModal({ session, onCreated, onCancel }) {
  const [name,   setName]   = useState('')
  const [emoji,  setEmoji]  = useState('📁')
  const [color,  setColor]  = useState('#a855f7')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await createCategory(session.user.id, { name, color, emoji })
    setSaving(false)
    if (err) { setError('Could not save — try again.'); return }
    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-slate-900 font-bold text-lg mb-5">New Category</h2>

        {/* Live preview */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-2xl">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: color + '25' }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-bold text-base truncate">{name || 'Category name'}</p>
            <p className="text-slate-400 text-xs">0 tasks</p>
          </div>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        </div>

        {/* Name */}
        <div className="mb-4">
          <p className="text-slate-500 text-xs font-semibold mb-1.5">NAME</p>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSave() }}
            placeholder="e.g. Thesis, Gym, Startup…"
            className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {/* Emoji */}
        <div className="mb-4">
          <p className="text-slate-500 text-xs font-semibold mb-1.5">EMOJI</p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-slate-200 ring-2 ring-accent-deep/30 scale-110' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color swatches */}
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-semibold mb-1.5">COLOR</p>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-slate-200 hover:scale-110 transition-all"
              title="Custom color"
              style={{ backgroundColor: COLOR_OPTIONS.includes(color) ? '#e2e8f0' : color }}
            >
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40 transition-colors active:bg-accent-mid"
          >
            {saving ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyTasks({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <img src={mascot} alt="Lista" className="w-32 h-32 object-contain mb-2" style={{ mixBlendMode: 'multiply' }} />
      <p className="text-slate-500 font-semibold text-sm">No tasks yet</p>
      <p className="text-slate-400 text-xs mt-1 mb-4">Create a category or add your first task</p>
      <button
        onClick={() => onNavigate('home', { focusChat: true })}
        className="border border-black/10 text-slate-500 text-sm px-4 py-2 rounded-xl hover:text-accent-deep hover:border-accent-deep/30 transition-colors"
      >
        Add a task
      </button>
    </div>
  )
}

function EmptyCategory({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
      <img src={mascot} alt="Lista" className="w-24 h-24 object-contain mb-2 opacity-70" style={{ mixBlendMode: 'multiply' }} />
      <p className="text-slate-500 font-semibold text-sm">No tasks here yet</p>
      <p className="text-slate-400 text-xs mt-1 mb-3">Head to Home and add one</p>
      <button
        onClick={() => onNavigate('home', { focusChat: true })}
        className="border border-black/10 text-slate-500 text-sm px-4 py-2 rounded-xl hover:text-accent-deep hover:border-accent-deep/30 transition-colors"
      >
        Add a task
      </button>
    </div>
  )
}
