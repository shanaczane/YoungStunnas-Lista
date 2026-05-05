import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseTask } from '../lib/ai'
import ProfileAvatar from '../components/ProfileAvatar'
import { CATEGORY_COLORS, formatDueDate } from '../lib/utils'

export default function SpacesScreen({ session, displayName, onNavigate }) {
  const [spaces, setSpaces] = useState([])
  const [activeSpace, setActiveSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchSpaces()
  }, [session.user.id])

  async function fetchSpaces() {
    setLoading(true)
    const { data } = await supabase
      .from('spaces')
      .select('*, space_members(user_id, display_name)')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false })
    setSpaces(data || [])
    setLoading(false)
  }

  async function handleCreateSpace(name) {
    const newSpace = {
      id: crypto.randomUUID(),
      name,
      owner_id: session.user.id,
      created_at: new Date().toISOString(),
      space_members: [{ user_id: session.user.id, display_name: displayName }],
    }

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, owner_id: session.user.id })
      .select()
      .single()

    if (!error && data) {
      await supabase.from('space_members').insert({
        space_id: data.id,
        user_id: session.user.id,
        display_name: displayName,
      })
      const created = { ...data, space_members: [{ user_id: session.user.id, display_name: displayName }] }
      setSpaces(prev => [created, ...prev])
      setActiveSpace(created)
    } else {
      // DB not set up yet — use local state so the demo still works
      console.warn('Supabase spaces insert failed:', error?.message)
      setSpaces(prev => [newSpace, ...prev])
      setActiveSpace(newSpace)
    }

    setShowCreate(false)
  }

  if (activeSpace) {
    return (
      <SpaceBoard
        space={activeSpace}
        session={session}
        displayName={displayName}
        onNavigate={onNavigate}
        onBack={() => { setActiveSpace(null); fetchSpaces() }}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <header className="flex items-center justify-between px-5 pt-6 pb-4 bg-white border-b border-black/6">
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Spaces</h1>
          <p className="text-slate-400 text-xs mt-0.5">Collaborate with your team</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-full bg-accent-deep flex items-center justify-center text-white transition-colors active:bg-accent-mid"
            style={{ boxShadow: '0 4px 12px rgba(26,79,214,0.35)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
      </header>

      {showCreate && (
        <CreateSpaceModal
          onConfirm={handleCreateSpace}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex-1 px-5">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <EmptySpaces onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-3">
            {spaces.map(space => (
              <button
                key={space.id}
                onClick={() => setActiveSpace(space)}
                className="w-full bg-card-bg rounded-2xl p-4 border border-black/8 hover:border-accent-light/30 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-semibold">{space.name}</p>
                  {space.owner_id === session.user.id && (
                    <span className="text-[10px] text-accent-pale border border-accent-deep/40 px-2 py-0.5 rounded-full">Owner</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {(space.space_members || []).slice(0, 5).map((m, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-accent-deep flex items-center justify-center text-white text-[10px] font-semibold border border-app-bg"
                    >
                      {(m.display_name || '?')[0].toUpperCase()}
                    </div>
                  ))}
                  {(space.space_members || []).length > 5 && (
                    <span className="text-white/30 text-xs">+{space.space_members.length - 5}</span>
                  )}
                  <span className="text-slate-400 text-xs ml-1">
                    {(space.space_members || []).length} member{(space.space_members || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SpaceBoard({ space, session, displayName, onBack, onNavigate }) {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState(space.space_members || [])
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [filterMine, setFilterMine] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const inputRef = useRef(null)

  const fetchSpaceTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }, [space.id])

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('space_members')
      .select('user_id, display_name')
      .eq('space_id', space.id)
    setMembers(data || [])
  }, [space.id])

  useEffect(() => {
    fetchSpaceTasks()
    fetchMembers()

    const channel = supabase
      .channel(`space-${space.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `space_id=eq.${space.id}`,
      }, fetchSpaceTasks)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [space.id, fetchSpaceTasks, fetchMembers])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      // Auto-assign if assignee name matches a member
      let assignee = parsed.assignee
      if (assignee) {
        const match = members.find(m =>
          m.display_name?.toLowerCase().includes(assignee.toLowerCase())
        )
        if (match) assignee = match.display_name
      }
      setParseCard({ raw: trimmed, ...parsed, assignee })
    } catch {
      setParseCard({ raw: trimmed, task: trimmed, due_date: null, category: 'Work', assignee: null })
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parseCard) return
    await supabase.from('tasks').insert({
      user_id: session.user.id,
      space_id: space.id,
      content: parseCard.raw,
      task_name: parseCard.task,
      due_date: parseCard.due_date || null,
      category: parseCard.category || 'Work',
      assignee: parseCard.assignee || null,
    })
    setParseCard(null)
    setInput('')
  }

  const inviteLink = `${window.location.origin}?join=${space.id}`
  const displayed = filterMine
    ? tasks.filter(t => t.assignee?.toLowerCase().includes(displayName.split(' ')[0].toLowerCase()))
    : tasks

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <header className="px-5 pt-6 pb-3">
        <button onClick={onBack} className="text-accent-light text-sm mb-3 flex items-center gap-1">
          <span>←</span> All Spaces
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 font-bold text-xl">{space.name}</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              {members.slice(0, 5).map((m, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-accent-deep flex items-center justify-center text-white text-[10px] font-semibold border border-app-bg">
                  {(m.display_name || '?')[0].toUpperCase()}
                </div>
              ))}
              {space.owner_id === session.user.id && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-white/40 text-xs hover:text-white hover:border-white/60 transition-colors"
                >
                  +
                </button>
              )}
            </div>
          </div>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
      </header>

      {/* Filter pill */}
      <div className="px-5 pb-3">
        <button
          onClick={() => setFilterMine(v => !v)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            filterMine ? 'bg-accent-deep text-white' : 'border border-white/20 text-white/50'
          }`}
        >
          Assigned to Me
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="mx-5 mb-4 bg-card-bg rounded-2xl p-4 border border-accent-mid/30">
          <p className="text-slate-400 text-xs mb-2">Share this link to invite members</p>
          <p className="text-accent-deep text-xs break-all font-mono bg-slate-50 rounded-lg px-3 py-2">{inviteLink}</p>
          <button
            onClick={() => { navigator.clipboard?.writeText(inviteLink); setShowInvite(false) }}
            className="mt-3 w-full bg-accent-deep text-white py-2 rounded-xl text-sm font-medium hover:bg-accent-mid transition-colors"
          >
            Copy Link
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-44 space-y-2">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <p className="text-slate-400 text-sm">No tasks yet. Type below to add one.</p>
          </div>
        ) : (
          displayed.map(task => <SpaceTaskCard key={task.id} task={task} />)
        )}
      </div>

      {/* Bottom fixed area: parse card + chat input stacked */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/95 backdrop-blur-sm flex flex-col gap-2">
        {parseCard && (
          <div className="bg-card-bg border border-accent-mid/40 rounded-2xl p-4 shadow-xl animate-slide-up">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-2">AI Parsed</p>
            <p className="text-white text-sm font-medium">{parseCard.task}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
              {parseCard.due_date && <span>📅 {new Date(parseCard.due_date).toLocaleDateString()}</span>}
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ backgroundColor: CATEGORY_COLORS[parseCard.category]?.bg, color: CATEGORY_COLORS[parseCard.category]?.text }}
              >
                {parseCard.category}
              </span>
              {parseCard.assignee && (
                <span className="text-accent-light font-medium">→ {parseCard.assignee}</span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setParseCard(null)}
                className="flex-1 py-2 rounded-xl border border-black/10 text-slate-500 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-xl bg-accent-deep text-white text-sm font-semibold hover:bg-accent-mid transition-colors"
              >
                Add to Space
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white border border-black/10 rounded-2xl px-4 py-3 shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
            placeholder={`Add a task for the team... "Mel finalize slides by Sunday"`}
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full bg-accent-deep hover:bg-accent-mid flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {parsing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function SpaceTaskCard({ task }) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Work
  return (
    <div className="bg-card-bg rounded-xl flex items-center border border-white/10 overflow-hidden">
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />
      <div className="flex-1 py-3 px-3 min-w-0">
        <p className={`text-sm font-medium leading-tight ${task.is_complete ? 'line-through text-white/25' : 'text-white'}`}>
          {task.task_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.due_date && <p className="text-white/40 text-xs">{formatDueDate(task.due_date)}</p>}
          {task.assignee && (
            <span className="text-accent-light text-xs">→ {task.assignee}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 pr-3">
        {task.assignee ? (
          <div className="w-7 h-7 rounded-full bg-accent-deep flex items-center justify-center text-white text-[11px] font-semibold">
            {task.assignee[0].toUpperCase()}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-300 text-xs">
            ?
          </div>
        )}
      </div>
    </div>
  )
}

function CreateSpaceModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full bg-white rounded-t-3xl p-6 border-t border-black/8">
        <h2 className="text-slate-900 font-bold text-lg mb-4">Create a Space</h2>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()) }}
          placeholder="Space name (e.g. Sprint 3, Study Group)"
          className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm">Cancel</button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent-mid transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptySpaces({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <img src="/mascots/spaces.png" alt="Ollie" className="w-36 h-36 object-contain mb-2" />
      <p className="text-slate-500 text-sm mb-1">No spaces yet</p>
      <p className="text-slate-300 text-xs mb-5">Create a space to collaborate with your team</p>
      <button
        onClick={onCreate}
        className="bg-accent-deep hover:bg-accent-mid text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
      >
        Create a Space
      </button>
    </div>
  )
}
