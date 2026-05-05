import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseTask } from '../lib/ai'
import { CATEGORY_COLORS, formatDueDate, getGreeting } from '../lib/utils'

export default function HomeScreen({
  session,
  displayName,
  tasks,
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
      // DB not set up yet — save locally so the demo still works
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
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-xl tracking-tight">Lista</h1>
        <div className="flex items-center gap-3">
          <p className="text-accent-pale text-sm">{getGreeting()}, {displayName.split(' ')[0]}</p>
          <button
            onClick={() => onNavigate('notifications')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <BellIcon />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-40">
        {tasks.length === 0 ? (
          <EmptyHome />
        ) : (
          <>
            {/* Upcoming strip */}
            {upcoming.length > 0 && (
              <section className="px-5 mb-6">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Due Soon</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {upcoming.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onOpenTask(task.id)}
                      className="flex-shrink-0 bg-card-bg rounded-xl px-3 py-2.5 text-left min-w-[140px] border border-white/10 hover:border-accent-light/40 transition-colors"
                    >
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{task.task_name}</p>
                      <p className="text-accent-pale text-[10px] mt-1">{formatDueDate(task.due_date)}</p>
                      <span
                        className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: CATEGORY_COLORS[task.category]?.bg, color: CATEGORY_COLORS[task.category]?.text }}
                      >
                        {task.category}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recent tasks */}
            <section className="px-5">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Recent Tasks</p>
              <div className="space-y-2">
                {recent.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask(task.id)}
                    className="w-full bg-card-bg rounded-xl px-4 py-3 flex items-center gap-3 border border-white/10 hover:border-accent-light/30 transition-colors text-left"
                  >
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[task.category]?.border }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${task.is_complete ? 'line-through text-white/30' : 'text-white'}`}>
                        {task.task_name}
                      </p>
                      {task.due_date && (
                        <p className="text-white/40 text-xs mt-0.5">{formatDueDate(task.due_date)}</p>
                      )}
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: CATEGORY_COLORS[task.category]?.bg, color: CATEGORY_COLORS[task.category]?.text }}
                    >
                      {task.category}
                    </span>
                  </button>
                ))}
              </div>
              {tasks.length > 5 && (
                <button
                  onClick={() => onNavigate('tasks')}
                  className="w-full mt-3 text-accent-light text-sm py-2 hover:text-white transition-colors"
                >
                  View all {tasks.length} tasks →
                </button>
              )}
            </section>
          </>
        )}
      </div>

      {/* Bottom fixed area: parse card + chat input stacked */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/95 backdrop-blur-sm flex flex-col gap-2">
        {/* Parse card */}
        {parseCard && (
          <div className="bg-card-bg border border-accent-mid/40 rounded-2xl p-4 shadow-xl animate-slide-up">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-3">AI Parsed</p>
            {parseError && <p className="text-amber-400 text-xs mb-2">{parseError}</p>}

            <div className="space-y-2 mb-3">
              <EditableRow
                label="Task"
                value={parseCard.task}
                onChange={v => handleEditField('task', v)}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-white/40 text-[10px] mb-1">Category</p>
                  <select
                    value={parseCard.category || 'Personal'}
                    onChange={e => handleEditField('category', e.target.value)}
                    className="w-full bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none border border-transparent focus:border-accent-mid"
                  >
                    {['School','Work','Personal','Errands','Health'].map(c => (
                      <option key={c} value={c} style={{ background: '#0D3875' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-white/40 text-[10px] mb-1">Due Date</p>
                  <input
                    type="datetime-local"
                    value={parseCard.due_date ? parseCard.due_date.slice(0, 16) : ''}
                    onChange={e => handleEditField('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none border border-transparent focus:border-accent-mid"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setParseCard(null); setParseError('') }}
                className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm hover:text-white hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-xl bg-accent-deep hover:bg-accent-mid text-white text-sm font-semibold transition-colors"
              >
                Save Task
              </button>
            </div>
          </div>
        )}

        {/* Chat input */}
        <div className="flex items-center gap-2 bg-card-bg border border-white/15 rounded-2xl px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type anything... "finish report by Friday"'
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full bg-accent-deep hover:bg-accent-mid flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
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
      <p className="text-white/40 text-[10px] mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-accent-mid"
      />
    </div>
  )
}

function EmptyHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-deep/20 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-light">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <p className="text-white font-semibold text-lg">Type your first task</p>
      <p className="text-white/40 text-sm mt-2 leading-relaxed">
        Just type naturally below — Lista will organize it for you automatically.
      </p>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
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
