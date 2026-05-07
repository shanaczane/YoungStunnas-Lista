import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseTask } from '../lib/ai'
import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import { formatDueDate } from '../lib/utils'
import { getCategoryColor } from '../lib/categories'
import mascot from '../mascots/home-mascot.png'

// Space theme colors — pastel only, applied to UI backgrounds/accents (NOT member identity)
const SPACE_COLORS = ['#A5B4FC','#C4B5FD','#F9A8D4','#FCD34D','#6EE7B7','#FCA5A5','#67E8F9','#7DD3FC']

// Member identity colors — fixed palette, never driven by theme
const IDENTITY_COLORS = ['#6366F1','#EC4899','#10B981','#F59E0B','#06B6D4','#8B5CF6','#EF4444','#0EA5E9','#14B8A6','#F97316']

// Deterministic identity color per member name — never changes regardless of theme
function memberColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return IDENTITY_COLORS[Math.abs(hash) % IDENTITY_COLORS.length]
}

const CATEGORIES = ['Work','Personal','School','Errands','Health']
const PINNED_KEY = 'lista_pinned_spaces'

// ── Spaces list ───────────────────────────────────────────────────────────────
export default function SpacesScreen({ session, displayName, onNavigate }) {
  const [spaces, setSpaces] = useState([])
  const [activeSpace, setActiveSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSpace, setEditingSpace] = useState(null)
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds))
  }, [pinnedIds])

  useEffect(() => { fetchSpaces() }, [session.user.id])

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

  function togglePin(id, e) {
    e.stopPropagation()
    setPinnedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [id, ...prev])
  }

  const sorted = [...spaces].sort((a, b) => {
    const ap = pinnedIds.includes(a.id), bp = pinnedIds.includes(b.id)
    if (ap && !bp) return -1
    if (!ap && bp) return 1
    return 0
  })

  async function handleCreateSpace({ name, description, color }) {
    const { data, error } = await supabase
      .from('spaces').insert({ name, description, color, owner_id: session.user.id }).select().single()
    if (!error && data) {
      await supabase.from('space_members').insert({ space_id: data.id, user_id: session.user.id, display_name: displayName })
      const created = { ...data, description, color, space_members: [{ user_id: session.user.id, display_name: displayName }] }
      setSpaces(prev => [created, ...prev])
      setActiveSpace(created)
    }
    setShowCreate(false)
  }

  async function handleDeleteFromList(spaceId) {
    await supabase.from('tasks').delete().eq('space_id', spaceId)
    await supabase.from('space_members').delete().eq('space_id', spaceId)
    await supabase.from('spaces').delete().eq('id', spaceId)
    setSpaces(prev => prev.filter(s => s.id !== spaceId))
    setPinnedIds(prev => prev.filter(p => p !== spaceId))
    setEditingSpace(null)
  }

  if (activeSpace) {
    return (
      <SpaceBoard
        space={activeSpace}
        session={session}
        displayName={displayName}
        onNavigate={onNavigate}
        onBack={() => { setActiveSpace(null); fetchSpaces() }}
        onSpaceDeleted={() => { setActiveSpace(null); fetchSpaces() }}
        onSpaceUpdated={updates => setSpaces(prev => prev.map(s => s.id === activeSpace.id ? { ...s, ...updates } : s))}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader>
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Spaces</h1>
          <p className="text-slate-400 text-xs mt-0.5">Collaborate with your team</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/15 text-slate-700 text-xs font-semibold transition-colors active:bg-slate-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Space
          </button>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
      </ScreenHeader>

      {showCreate && (
        <CreateSpaceModal onConfirm={handleCreateSpace} onCancel={() => setShowCreate(false)} />
      )}
      {editingSpace && (
        <SpaceSettingsModal
          space={editingSpace}
          session={session}
          onSave={async updates => {
            await supabase.from('spaces').update(updates).eq('id', editingSpace.id)
            setSpaces(prev => prev.map(s => s.id === editingSpace.id ? { ...s, ...updates } : s))
            setEditingSpace(null)
          }}
          onDelete={() => handleDeleteFromList(editingSpace.id)}
          onClose={() => setEditingSpace(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <EmptySpaces onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-3">
            {sorted.map(space => {
              const isPinned = pinnedIds.includes(space.id)
              const memberCount = (space.space_members || []).length
              const shownMembers = (space.space_members || []).slice(0, 4)
              const spaceColor = space.color || '#818CF8'
              const cardBg = space.color ? space.color + '18' : '#ffffff'
              return (
                <div key={space.id}>
                  {isPinned && (
                    <div className="flex items-center gap-1 mb-1 pl-1">
                      <PinIcon size={10} filled />
                      <span className="text-[10px] font-bold text-accent-deep uppercase tracking-wider">Pinned</span>
                    </div>
                  )}
                  <button
                    onClick={() => setActiveSpace(space)}
                    className={`w-full rounded-2xl p-4 card-elevated flex items-center gap-3 text-left transition-all active:scale-[0.99] ${isPinned ? 'ring-1 ring-accent-deep/20' : ''}`}
                    style={{ backgroundColor: cardBg }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                      style={{ backgroundColor: spaceColor + '20', color: spaceColor }}
                    >
                      {(space.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 font-bold text-base truncate">{space.name}</p>
                        {space.owner_id === session.user.id && (
                          <span className="text-[10px] text-accent-deep border border-accent-deep/30 bg-accent-pale px-2 py-0.5 rounded-full flex-shrink-0">Owner</span>
                        )}
                      </div>
                      {space.description && <p className="text-slate-400 text-xs mt-0.5 truncate">{space.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {shownMembers.map((m, i) => (
                            <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                              style={{ backgroundColor: memberColor(m.display_name || ''), outline: `2px solid ${cardBg}` }}>
                              {(m.display_name || '?')[0].toUpperCase()}
                            </div>
                          ))}
                          {memberCount > 4 && (
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[7px] font-bold"
                              style={{ outline: `2px solid ${cardBg}` }}>
                              +{memberCount - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-400 text-xs">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => togglePin(space.id, e)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isPinned ? 'text-accent-deep' : 'text-slate-200 hover:text-slate-400'}`}
                      >
                        <PinIcon filled={isPinned} size={14} />
                      </button>
                      <button
                        onClick={() => setEditingSpace(space)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                        </svg>
                      </button>
                    </div>
                  </button>
                </div>
              )
            })}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Space Board ───────────────────────────────────────────────────────────────
function SpaceBoard({ space, session, displayName, onBack, onNavigate, onSpaceDeleted, onSpaceUpdated }) {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState(space.space_members || [])
  const [spaceData, setSpaceData] = useState(space)
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [memberFilter, setMemberFilter] = useState(null)
  const [sortBy, setSortBy] = useState('created')
  const [groupByMember, setGroupByMember] = useState(false)
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [modifications, setModifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lista_mods_${space.id}`) || '{}') }
    catch { return {} }
  })
  const [viewMode, setViewMode] = useState('list')
  const [inProgressIds, setInProgressIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`lista_kanban_${space.id}`) || '[]')) }
    catch { return new Set() }
  })
  const [showDetails, setShowDetails] = useState(false)
  const [moveLog, setMoveLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lista_moves_${space.id}`) || '[]') }
    catch { return [] }
  })
  const inputRef = useRef(null)

  function openMemberProfile(displayName) {
    if (!displayName) return
    const found = members.find(m => m.display_name?.toLowerCase() === displayName.toLowerCase())
    setSelectedMember(found || { display_name: displayName, user_id: null })
  }

  const fetchSpaceTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks').select('*').eq('space_id', spaceData.id).order('created_at', { ascending: false })
    setTasks(data || [])
  }, [spaceData.id])

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('space_members').select('user_id, display_name').eq('space_id', spaceData.id)
    if (data) setMembers(data)
  }, [spaceData.id])

  useEffect(() => {
    fetchSpaceTasks()
    fetchMembers()
    const channel = supabase
      .channel(`space-${spaceData.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `space_id=eq.${spaceData.id}` }, fetchSpaceTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [spaceData.id, fetchSpaceTasks, fetchMembers])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      let assignee = parsed.assignee
      if (assignee) {
        const match = members.find(m => m.display_name?.toLowerCase().includes(assignee.toLowerCase()))
        if (match) assignee = match.display_name
      }
      setParseCard({ raw: trimmed, ...parsed, assignee: assignee || displayName })
    } catch {
      setParseCard({ raw: trimmed, task: trimmed, due_date: null, category: 'Work', assignee: displayName })
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parseCard) return
    const { error } = await supabase.from('tasks').insert({
      user_id: session.user.id,
      space_id: spaceData.id,
      content: parseCard.raw,
      task_name: parseCard.task,
      due_date: parseCard.due_date || null,
      category: parseCard.category || 'Work',
      assignee: parseCard.assignee || displayName,
    })
    if (!error) fetchSpaceTasks()
    setParseCard(null)
    setInput('')
  }

  async function handleToggle(task) {
    const updated = !task.is_complete
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_complete: updated } : t))
    await supabase.from('tasks').update({ is_complete: updated }).eq('id', task.id)
  }

  function handleStatusChange(task, newStatus) {
    // Compute toggle need before entering state updater to avoid side-effects inside setState
    const needsToggle =
      (newStatus === 'inprogress' && task.is_complete) ||
      (newStatus === 'todo' && task.is_complete) ||
      (newStatus === 'done' && !task.is_complete)

    setInProgressIds(prev => {
      const next = new Set(prev)
      if (newStatus === 'inprogress') next.add(task.id)
      else next.delete(task.id)
      localStorage.setItem(`lista_kanban_${space.id}`, JSON.stringify([...next]))
      return next
    })

    if (needsToggle) handleToggle(task)
  }

  function handleLogMove(task, fromColId, toColId) {
    const fromCol = KANBAN_COLS.find(c => c.id === fromColId)
    const toCol   = KANBAN_COLS.find(c => c.id === toColId)
    const entry = {
      taskId: task.id,
      taskName: task.task_name,
      from: fromColId,
      to: toColId,
      fromLabel: fromCol?.label || fromColId,
      toLabel: toCol?.label || toColId,
      by: displayName,
      at: new Date().toISOString(),
    }
    setMoveLog(prev => {
      const next = [entry, ...prev].slice(0, 100)
      localStorage.setItem(`lista_moves_${space.id}`, JSON.stringify(next))
      return next
    })
  }

  function handleDrop(task, toColId) {
    const fromColId = task.is_complete ? 'done' : inProgressIds.has(task.id) ? 'inprogress' : 'todo'
    if (fromColId === toColId) return
    handleStatusChange(task, toColId)
    handleLogMove(task, fromColId, toColId)
  }

  async function handleTaskUpdate(taskId, updates) {
    const oldTask = tasks.find(t => t.id === taskId)
    const { data } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single()
    if (data) {
      setTasks(prev => prev.map(t => t.id === taskId ? data : t))

      // Track which fields changed (store actual new values for display)
      const changed = []
      if (updates.task_name !== undefined && updates.task_name !== oldTask?.task_name)
        changed.push({ field: 'title', to: updates.task_name })
      if (updates.category !== undefined && updates.category !== oldTask?.category)
        changed.push({ field: 'category', to: updates.category })
      if (updates.due_date !== undefined && updates.due_date !== oldTask?.due_date)
        changed.push({ field: 'due date', to: updates.due_date ? formatDueDate(updates.due_date) : 'none' })
      if (updates.assignee !== undefined && updates.assignee !== oldTask?.assignee)
        changed.push({ field: 'assignee', to: updates.assignee || 'unassigned' })

      if (changed.length > 0) {
        setModifications(prev => {
          const next = {
            ...prev,
            [taskId]: { by: displayName, at: new Date().toISOString(), changes: changed },
          }
          localStorage.setItem(`lista_mods_${spaceData.id}`, JSON.stringify(next))
          return next
        })
      }
    }
    setEditingTask(null)
  }

  async function handleTaskDelete(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setEditingTask(null)
  }

  async function handleSpaceSave(updates) {
    await supabase.from('spaces').update(updates).eq('id', spaceData.id)
    setSpaceData(prev => ({ ...prev, ...updates }))
    onSpaceUpdated?.(updates)
    setShowSettings(false)
  }

  async function handleSpaceDelete() {
    await supabase.from('tasks').delete().eq('space_id', spaceData.id)
    await supabase.from('space_members').delete().eq('space_id', spaceData.id)
    await supabase.from('spaces').delete().eq('id', spaceData.id)
    onSpaceDeleted?.()
  }

  // Filter + sort
  let filtered = tasks
  if (statusFilter === 'active') filtered = filtered.filter(t => !t.is_complete)
  else if (statusFilter === 'done') filtered = filtered.filter(t => t.is_complete)
  if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter)
  if (memberFilter) filtered = filtered.filter(t => t.assignee?.toLowerCase().includes(memberFilter.toLowerCase()))

  const displayed = [...filtered].sort((a, b) => {
    if (sortBy === 'due') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (sortBy === 'alpha') return (a.task_name || '').localeCompare(b.task_name || '')
    if (sortBy === 'assignee') return (a.assignee || 'zzz').localeCompare(b.assignee || 'zzz')
    return 0
  })

  const grouped = groupByMember
    ? displayed.reduce((acc, t) => {
        const key = t.assignee || 'Unassigned'
        acc[key] = acc[key] || []
        acc[key].push(t)
        return acc
      }, {})
    : null

  const activeFilterCount = [statusFilter !== 'all', !!categoryFilter, !!memberFilter, sortBy !== 'created', groupByMember].filter(Boolean).length
  const spaceColor = spaceData.color || '#818CF8'
  const boardBg = spaceData.color ? spaceData.color + '18' : undefined

  return (
    <div className={`flex flex-col min-h-screen ${!spaceData.color ? 'bg-app-bg' : ''}`}
      style={boardBg ? { backgroundColor: boardBg } : undefined}>
      <ScreenHeader className="px-5 pt-6 pb-3">
        <button onClick={onBack} className="flex items-center gap-1 text-accent-deep text-sm font-medium mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          All Spaces
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: spaceColor + '20', color: spaceColor }}
            >
              {(spaceData.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-900 font-bold text-xl truncate">{spaceData.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex -space-x-1">
                  {members.slice(0, 5).map((m, i) => (
                    <button key={i} onClick={() => openMemberProfile(m.display_name)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold border-2 border-app-bg transition-transform active:scale-90"
                      style={{ backgroundColor: memberColor(m.display_name || '') }}>
                      {(m.display_name || '?')[0].toUpperCase()}
                    </button>
                  ))}
                </div>
                <span className="text-slate-400 text-xs">{members.length} member{members.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowDetails(true)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              title="Space Details"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
            </button>
            <button
              onClick={() => setShowActivity(v => !v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showActivity ? 'bg-accent-pale text-accent-deep' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
            <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
          </div>
        </div>
      </ScreenHeader>

      {/* Filter row */}
      <div className="relative">
        <div className="px-5 pb-2 flex items-center gap-2">
          <button
            onClick={() => setShowFilterBar(v => !v)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeFilterCount > 0 ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
            {[
              { id: 'list',    label: 'List',    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
              { id: 'kanban',  label: 'Kanban',  icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="5" height="18" rx="1"/></svg> },
              { id: 'table',   label: 'Table',   icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> },
              { id: 'members', label: 'Members', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
            ].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${viewMode === v.id ? 'bg-white text-accent-deep shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <span className="text-slate-300 text-xs">{displayed.length} task{displayed.length !== 1 ? 's' : ''}</span>
        </div>

      {/* Expanded filters — floats over task list */}
      {showFilterBar && (
        <div className="absolute top-full left-0 right-0 z-10 mx-4 rounded-2xl bg-card-bg border border-black/8 shadow-xl px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium">Status</span>
            <div className="flex gap-1.5">
              {['all','active','done'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium pt-1">Category</span>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(c => {
                const col = getCategoryColor(c)
                return (
                  <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                    style={categoryFilter === c ? { backgroundColor: col.border, color: '#fff' } : { backgroundColor: col.bg, color: col.text }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
          {members.length > 1 && (
            <div className="flex items-start gap-2">
              <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium pt-1">Member</span>
              <div className="flex gap-1.5 flex-wrap">
                {members.map(m => (
                  <button key={m.user_id} onClick={() => setMemberFilter(memberFilter === m.display_name ? null : m.display_name)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${memberFilter === m.display_name ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'}`}>
                    {m.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium">Sort</span>
            <div className="flex gap-1.5 flex-wrap">
              {[['created','Recent'],['due','Due'],['alpha','A–Z'],['assignee','Assignee']].map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === val ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilter('all'); setCategoryFilter(null); setMemberFilter(null); setSortBy('created'); setGroupByMember(false) }}
              className="text-red-400 text-xs font-medium">
              Clear all filters
            </button>
          )}
        </div>
      )}
      </div>

      {/* Task list / Kanban / Table / Members */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto overflow-y-auto pb-44 pt-2">
          <KanbanView
            tasks={displayed}
            members={members}
            spaceColor={spaceColor}
            themeColor={spaceData.color}
            inProgressIds={inProgressIds}
            modifications={modifications}
            onToggle={handleToggle}
            onClick={task => setEditingTask(task)}
            onMemberClick={openMemberProfile}
            onStatusChange={handleStatusChange}
            onDrop={handleDrop}
          />
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 overflow-auto pb-44">
          <TableView
            tasks={displayed}
            members={members}
            themeColor={spaceData.color}
            inProgressIds={inProgressIds}
            modifications={modifications}
            onToggle={handleToggle}
            onClick={task => setEditingTask(task)}
            onMemberClick={openMemberProfile}
            onStatusChange={handleStatusChange}
          />
        </div>
      ) : viewMode === 'members' ? (
        <div className="flex-1 overflow-y-auto pb-44 pt-2">
          <MemberView
            tasks={tasks}
            members={members}
            inProgressIds={inProgressIds}
            modifications={modifications}
            spaceColor={spaceColor}
            themeColor={spaceData.color}
            onMemberClick={openMemberProfile}
            onTaskClick={task => setEditingTask(task)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-44 space-y-2.5">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[25vh] text-center">
              <p className="text-slate-400 text-sm font-medium">No tasks</p>
              <p className="text-slate-300 text-xs mt-1">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Type below to add one for the team'}
              </p>
            </div>
          ) : grouped ? (
            Object.entries(grouped).map(([member, memberTasks]) => (
              <div key={member} className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <button onClick={() => openMemberProfile(member)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-transform active:scale-90"
                    style={{ backgroundColor: memberColor(member) }}>
                    {member[0].toUpperCase()}
                  </button>
                  <span className="text-slate-600 text-xs font-bold">{member}</span>
                  <span className="text-slate-300 text-xs">· {memberTasks.length}</span>
                </div>
                {memberTasks.map(task => (
                  <SpaceTaskCard
                    key={task.id} task={task} members={members} spaceColor={spaceColor} themeColor={spaceData.color}
                    onToggle={() => handleToggle(task)} onClick={() => setEditingTask(task)}
                    onMemberClick={openMemberProfile}
                  />
                ))}
              </div>
            ))
          ) : (
            displayed.map(task => (
              <SpaceTaskCard
                key={task.id} task={task} members={members} spaceColor={spaceColor} themeColor={spaceData.color}
                onToggle={() => handleToggle(task)} onClick={() => setEditingTask(task)}
                onMemberClick={openMemberProfile}
              />
            ))
          )}
        </div>
      )}

      {/* Bottom input */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="rounded-2xl p-4 card-elevated-lg" style={{ backgroundColor: spaceData.color ? spaceData.color + '28' : '#ffffff' }}>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">AI Parsed · Space Task</p>
            <p className="text-slate-800 text-sm font-semibold">{parseCard.task}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {parseCard.due_date && (
                <span className="text-slate-400 text-xs">📅 {new Date(parseCard.due_date).toLocaleDateString()}</span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: getCategoryColor(parseCard.category).bg, color: getCategoryColor(parseCard.category).text }}>
                {parseCard.category}
              </span>
              {parseCard.assignee && <span className="text-accent-deep text-xs font-medium">→ {parseCard.assignee}</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setParseCard(null)} className="flex-1 py-2.5 rounded-xl border border-black/10 text-slate-500 text-sm font-medium">Cancel</button>
              <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl bg-accent-deep text-white text-sm font-bold">Add to Space</button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 border border-black/10 rounded-2xl px-4 py-3 shadow-sm"
          style={{ backgroundColor: spaceData.color ? spaceData.color + '28' : '#ffffff' }}>
          <input
            ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
            placeholder={`Add a task... "Mel finalize slides by Sunday"`}
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSend} disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full bg-accent-deep hover:bg-accent-mid flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {parsing
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            }
          </button>
        </div>
      </div>

      {showSettings && (
        <SpaceSettingsModal
          space={spaceData} session={session}
          onSave={handleSpaceSave}
          onDelete={handleSpaceDelete}
          onClose={() => { setShowSettings(false); fetchMembers() }}
          onMemberClick={name => { setShowSettings(false); openMemberProfile(name) }}
        />
      )}
      {editingTask && (
        <SpaceTaskModal
          task={editingTask} members={members}
          modification={modifications[editingTask.id] || null}
          onSave={updates => handleTaskUpdate(editingTask.id, updates)}
          onDelete={() => handleTaskDelete(editingTask.id)}
          onClose={() => setEditingTask(null)}
          onMemberClick={openMemberProfile}
        />
      )}
      {showActivity && (
        <ActivityDrawer
          tasks={tasks} members={members} spaceColor={spaceColor}
          moveLog={moveLog}
          onClose={() => setShowActivity(false)}
          onMemberClick={openMemberProfile}
        />
      )}
      {showDetails && (
        <SpaceDetailsModal
          tasks={tasks} members={members} spaceColor={spaceColor}
          onClose={() => setShowDetails(false)}
        />
      )}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          tasks={tasks}
          modifications={modifications}
          spaceColor={spaceColor}
          onClose={() => setSelectedMember(null)}
          onNavigate={onNavigate}
          onOpenTask={task => { setSelectedMember(null); setEditingTask(task) }}
        />
      )}
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────
function SpaceTaskCard({ task, members, spaceColor, themeColor, onToggle, onClick, onMemberClick }) {
  const colors = getCategoryColor(task.category)
  const creator = members.find(m => m.user_id === task.user_id)
  const creatorName = creator?.display_name || null
  // Sanitize: treat the string "null"/"undefined" as absent
  const rawAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined')
    ? task.assignee : null
  const effectiveAssignee = rawAssignee || creatorName
  const sameAsCreator = effectiveAssignee && creatorName &&
    effectiveAssignee.split(' ')[0].toLowerCase() === creatorName.split(' ')[0].toLowerCase()

  return (
    <div
      className="rounded-2xl flex items-center card-elevated transition-all overflow-hidden active:scale-[0.99] cursor-pointer"
      style={{ backgroundColor: themeColor ? themeColor + '28' : '#ffffff' }}
      onClick={onClick}
    >
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        className="w-11 h-11 flex items-center justify-center flex-shrink-0"
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.is_complete ? 'bg-accent-deep border-accent-deep' : 'border-slate-300'}`}>
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 py-3.5 min-w-0">
        <p className={`text-sm font-semibold leading-tight truncate ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
          {task.task_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {task.due_date && <p className="text-slate-400 text-xs">{formatDueDate(task.due_date)}</p>}
          {effectiveAssignee && <span className="text-accent-deep text-xs font-medium">→ {effectiveAssignee}</span>}
        </div>
      </div>
      {/* Stacked avatars: assignee on top, creator offset below if different */}
      <div className="flex-shrink-0 pr-3">
        <div className="relative flex flex-col items-center">
          {effectiveAssignee && (
            <button onClick={e => { e.stopPropagation(); onMemberClick?.(effectiveAssignee) }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white transition-transform active:scale-90"
              style={{ backgroundColor: memberColor(effectiveAssignee) }}>
              {effectiveAssignee[0].toUpperCase()}
            </button>
          )}
          {creatorName && !sameAsCreator && (
            <button onClick={e => { e.stopPropagation(); onMemberClick?.(creatorName) }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white transition-transform active:scale-90 ${effectiveAssignee ? '-mt-2' : ''}`}
              style={{ backgroundColor: memberColor(creatorName) }}>
              {creatorName[0].toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit task modal ───────────────────────────────────────────────────────────
function SpaceTaskModal({ task, members, modification, onSave, onDelete, onClose, onMemberClick }) {
  const creator = members.find(m => m.user_id === task.user_id)
  const creatorName = creator?.display_name || null
  const sanitizedAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined')
    ? task.assignee : null

  const [taskName, setTaskName] = useState(task.task_name || '')
  const [category, setCategory] = useState(task.category || 'Work')
  const [assignee, setAssignee] = useState(sanitizedAssignee || creatorName || '')
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const createdAt = task.created_at ? new Date(task.created_at) : null
  const history = []
  if (createdAt) history.push({ label: 'Created', date: createdAt, icon: '✦', color: '#94a3b8', person: creatorName })
  if (modification) {
    const detail = modification.changes.map(c => typeof c === 'object' ? `${c.field} → "${c.to}"` : c).join(' · ')
    history.push({ label: 'Edited', date: new Date(modification.at), icon: '✎', color: '#8B5CF6', person: modification.by, detail })
  }
  if (task.is_complete) {
    const sanAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined') ? task.assignee : null
    history.push({ label: 'Completed', date: new Date(task.updated_at || task.created_at), icon: '✓', color: '#34d399', person: sanAssignee || creatorName })
  }
  history.sort((a, b) => a.date - b.date)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <div className="flex items-center justify-between mt-2 mb-5">
            <h2 className="text-slate-900 font-bold text-xl">Edit Task</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">Task</p>
            <input autoFocus type="text" value={taskName} onChange={e => setTaskName(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors" />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const col = getCategoryColor(c)
                return (
                  <button key={c} onClick={() => setCategory(c)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={category === c ? { backgroundColor: col.border, color: '#fff' } : { backgroundColor: col.bg, color: col.text }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">Due Date</p>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors" />
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Assignee</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAssignee('')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!assignee ? 'bg-slate-200 text-slate-700' : 'border border-black/10 text-slate-400'}`}>
                Unassigned
              </button>
              {members.map(m => (
                <button key={m.user_id} onClick={() => setAssignee(m.display_name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${assignee === m.display_name ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'}`}>
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="mb-5">
              <p className="text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">History</p>
              <div className="relative pl-4">
                <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-3">
                  {history.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10"
                        style={{ backgroundColor: ev.color }}>
                        {ev.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: ev.color }}>{ev.label}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {ev.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {ev.detail && (
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: ev.color }}>{ev.detail}</p>
                        )}
                      </div>
                      {ev.person ? (
                        <button onClick={() => onMemberClick?.(ev.person)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 transition-transform active:scale-90"
                          style={{ backgroundColor: memberColor(ev.person) }}>
                          {ev.person[0].toUpperCase()}
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] flex-shrink-0">?</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {confirmDelete ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-2">
              <p className="text-red-600 text-sm font-semibold mb-1">Delete this task?</p>
              <p className="text-red-400 text-xs mb-3">This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-red-100 text-slate-500 text-sm font-medium">Cancel</button>
                <button onClick={onDelete} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Delete</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-red-400 text-xs font-medium w-full text-center py-2">
              Delete Task
            </button>
          )}
        </div>
        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium">Cancel</button>
          <button
            onClick={() => onSave({ task_name: taskName.trim(), category, assignee: assignee || null, due_date: dueDate || null })}
            disabled={!taskName.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Space settings modal ──────────────────────────────────────────────────────
function SpaceSettingsModal({ space, session, onSave, onDelete, onClose, onMemberClick }) {
  const [name, setName] = useState(space.name || '')
  const [description, setDescription] = useState(space.description || '')
  const [color, setColor] = useState(space.color || null)
  const [members, setMembers] = useState(space.space_members || [])
  const [memberEmail, setMemberEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    supabase.from('space_members').select('user_id, display_name').eq('space_id', space.id)
      .then(({ data }) => { if (data) setMembers(data) })
  }, [space.id])

  async function handleAddMember() {
    const email = memberEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email'); return }
    setAddingMember(true)
    const displayName = email.split('@')[0]
    const { error } = await supabase.from('space_members').insert({
      space_id: space.id, user_id: crypto.randomUUID(), display_name: displayName,
    })
    if (!error) {
      setMembers(prev => [...prev, { user_id: crypto.randomUUID(), display_name: displayName }])
      setMemberEmail('')
      setEmailError('')
    } else {
      setEmailError('Could not add member')
    }
    setAddingMember(false)
  }

  async function handleRemoveMember(userId) {
    await supabase.from('space_members').delete().eq('space_id', space.id).eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <div className="flex items-center justify-between mt-2 mb-6">
            <h2 className="text-slate-900 font-bold text-xl">Space Settings</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">Space Name</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors" />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Description <span className="normal-case font-normal text-slate-300">(optional)</span>
            </p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep resize-none transition-colors" />
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Theme Color</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setColor(null)}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${!color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400 border-slate-300' : 'border-slate-200 hover:scale-110'}`}
                style={{ backgroundColor: '#ffffff' }}>
                {!color && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              {SPACE_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">Members</p>
            <div className="space-y-2 mb-3">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                  <button
                    onClick={() => onMemberClick?.(m.display_name)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: memberColor(m.display_name || '') }}>
                      {(m.display_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-slate-700 text-sm font-medium truncate">{m.display_name}</span>
                    <svg className="ml-auto flex-shrink-0 text-slate-300" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  {m.user_id !== session.user.id && (
                    <button onClick={() => handleRemoveMember(m.user_id)} className="text-slate-300 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="email" value={memberEmail}
                onChange={e => { setMemberEmail(e.target.value); setEmailError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember() } }}
                placeholder="Add member by email"
                className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-black/10 focus:border-accent-deep transition-colors" />
              <button onClick={handleAddMember} disabled={addingMember}
                className="px-4 py-2.5 rounded-xl bg-accent-deep text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Danger Zone</p>
            {confirmDelete ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-red-600 text-sm font-semibold mb-1">Delete "{space.name}"?</p>
                <p className="text-red-400 text-xs mb-3">All tasks in this space will be permanently deleted.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl border border-red-100 text-slate-500 text-sm font-medium">Cancel</button>
                  <button onClick={onDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold">Delete Space</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-100 text-red-400 text-sm font-medium">
                Delete Space
              </button>
            )}
          </div>
        </div>
        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium">Cancel</button>
          <button
            onClick={() => name.trim() && onSave({ name: name.trim(), description, color })}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity timeline drawer ──────────────────────────────────────────────────
function ActivityDrawer({ tasks, members, spaceColor, moveLog, onClose, onMemberClick }) {
  const events = []
  tasks.forEach(task => {
    const creator = members.find(m => m.user_id === task.user_id)
    const creatorName = creator?.display_name || null
    if (task.created_at) {
      events.push({ type: 'created', taskName: task.task_name, date: new Date(task.created_at), label: 'Task created', person: creatorName })
    }
    if (task.is_complete) {
      const sanAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined') ? task.assignee : null
      events.push({ type: 'completed', taskName: task.task_name, date: new Date(task.updated_at || task.created_at), label: 'Task completed', person: sanAssignee || creatorName })
    }
  })
  ;(moveLog || []).forEach(entry => {
    events.push({
      type: 'moved',
      taskName: entry.taskName,
      date: new Date(entry.at),
      label: `${entry.fromLabel} → ${entry.toLabel}`,
      person: entry.by,
      fromId: entry.from,
      toId: entry.to,
    })
  })
  events.sort((a, b) => b.date - a.date)

  const iconColor = ev => {
    if (ev.type === 'completed') return '#34d399'
    if (ev.type === 'moved') return KANBAN_COLS.find(c => c.id === ev.toId)?.color || '#a78bfa'
    return spaceColor
  }
  const iconGlyph = ev => {
    if (ev.type === 'completed') return '✓'
    if (ev.type === 'moved') return '↗'
    return '✦'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-6 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-slate-900 font-bold text-lg">Activity Timeline</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-8">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[20vh] text-center">
              <p className="text-slate-400 text-sm">No activity yet</p>
              <p className="text-slate-300 text-xs mt-1">Task events will appear here</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-slate-100" />
              <div className="space-y-4">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 relative z-10"
                      style={{ backgroundColor: iconColor(ev) }}
                    >
                      {iconGlyph(ev)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">{ev.label}</p>
                      <p className="text-slate-800 text-sm font-medium mt-0.5 truncate">{ev.taskName}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ev.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    {ev.person ? (
                      <button onClick={() => onMemberClick?.(ev.person)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 transition-transform active:scale-90"
                        style={{ backgroundColor: memberColor(ev.person) }}
                        title={ev.person}>
                        {ev.person[0].toUpperCase()}
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] flex-shrink-0">?</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Create space modal ────────────────────────────────────────────────────────
function CreateSpaceModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [members, setMembers] = useState([])
  const [emailError, setEmailError] = useState('')
  const [photo, setPhoto] = useState(null)
  const photoRef = useRef(null)

  function handleAddMember() {
    const email = memberEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email'); return }
    if (members.includes(email)) { setEmailError('Already added'); return }
    setMembers(prev => [...prev, email])
    setMemberEmail('')
    setEmailError('')
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <h2 className="text-slate-900 font-bold text-xl mt-2 mb-6">Create a Space</h2>

          <div className="flex justify-center mb-6">
            <button type="button" onClick={() => photoRef.current?.click()} className="relative group">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-200 group-hover:border-accent-deep transition-colors"
                style={{ backgroundColor: color + '20' }}
              >
                {photo
                  ? <img src={photo} alt="group" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold" style={{ color }}>{name ? name[0].toUpperCase() : '?'}</span>
                }
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-accent-deep rounded-full flex items-center justify-center border-2 border-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">Space Name</p>
            <input
              autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm({ name: name.trim(), description, color, members }) }}
              placeholder="e.g. Sprint 3, Study Group, Thesis Team"
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 transition-colors"
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Description <span className="text-slate-300 normal-case font-normal">(optional)</span>
            </p>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this space for?" rows={2}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 resize-none transition-colors" />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Theme Color</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setColor(null)}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${!color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400 border-slate-300' : 'border-slate-200 hover:scale-110'}`}
                style={{ backgroundColor: '#ffffff' }}>
                {!color && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              {SPACE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="mb-2">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">Invite Members</p>
            <div className="flex gap-2">
              <input type="email" value={memberEmail}
                onChange={e => { setMemberEmail(e.target.value); setEmailError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember() } }}
                placeholder="Enter email address"
                className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 transition-colors" />
              <button type="button" onClick={handleAddMember}
                className="px-4 py-3 rounded-xl bg-accent-deep text-white text-sm font-semibold hover:bg-accent-mid transition-colors">
                Add
              </button>
            </div>
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {members.map(email => (
                  <div key={email} className="flex items-center gap-1.5 bg-accent-pale text-accent-deep px-3 py-1.5 rounded-full text-xs font-medium">
                    <div className="w-4 h-4 rounded-full bg-accent-deep text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {email[0].toUpperCase()}
                    </div>
                    <span className="max-w-[140px] truncate">{email}</span>
                    <button type="button" onClick={() => setMembers(prev => prev.filter(m => m !== email))}
                      className="text-accent-deep/50 hover:text-red-400 ml-0.5 leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium">Cancel</button>
          <button
            onClick={() => name.trim() && onConfirm({ name: name.trim(), description, color, members })}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40 hover:bg-accent-mid transition-colors">
            Create Space
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Member profile modal ──────────────────────────────────────────────────────
function MemberProfileModal({ member, tasks, modifications = {}, spaceColor, onClose, onNavigate, onOpenTask }) {
  const name = member.display_name || 'Unknown'
  const [activeTab, setActiveTab] = useState('all')

  const createdTasks   = tasks.filter(t => t.user_id === member.user_id)
  const assignedTasks  = tasks.filter(t => t.assignee?.toLowerCase() === name.toLowerCase())
  const completedTasks = assignedTasks.filter(t => t.is_complete)
  const activeTasks    = assignedTasks.filter(t => !t.is_complete)
  const completionRate = assignedTasks.length > 0
    ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 0

  // Modified = tasks where this member made an edit (tracked in localStorage)
  const modifiedTasks = tasks
    .filter(t => modifications[t.id]?.by?.toLowerCase() === name.toLowerCase())
    .sort((a, b) => new Date(modifications[b.id].at) - new Date(modifications[a.id].at))

  const allTasks = [...new Map(
    [...createdTasks, ...assignedTasks, ...modifiedTasks].map(t => [t.id, t])
  ).values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // Build history events
  const historyEvents = []
  tasks.forEach(task => {
    const isCreator  = task.user_id === member.user_id
    const isAssigned = task.assignee?.toLowerCase() === name.toLowerCase()
    const mod        = modifications[task.id]
    const isModifier = mod?.by?.toLowerCase() === name.toLowerCase()
    if (isCreator)   historyEvents.push({ date: new Date(task.created_at), label: 'Created',  task, color: spaceColor })
    if (isAssigned && task.is_complete)
      historyEvents.push({ date: new Date(task.updated_at || task.created_at), label: 'Completed', task, color: '#34d399' })
    if (isModifier)
      historyEvents.push({ date: new Date(mod.at), label: 'Edited', task, color: '#8B5CF6', detail: mod.changes.map(c => typeof c === 'object' ? `${c.field} → "${c.to}"` : c).join(' · ') })
    if (isAssigned && !isCreator && !isModifier)
      historyEvents.push({ date: new Date(task.created_at), label: 'Assigned', task, color: '#94a3b8' })
  })
  historyEvents.sort((a, b) => b.date - a.date)

  const TABS = [
    { id: 'all',      label: 'All',         tasks: allTasks },
    { id: 'created',  label: 'Created',     tasks: createdTasks },
    { id: 'completed',label: 'Completed',   tasks: completedTasks },
    { id: 'active',   label: 'In Progress', tasks: activeTasks },
    { id: 'modified', label: 'Modified',    tasks: modifiedTasks },
    { id: 'history',  label: 'History',     tasks: null },
  ]

  const lastActive = allTasks[0]?.created_at

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 flex-shrink-0 border-b border-black/6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: memberColor(name) }}>
                {name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-slate-900 font-bold text-lg leading-tight">{name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: spaceColor + 'cc' }}>Member</span>
                  {lastActive && (
                    <span className="text-slate-400 text-[10px]">
                      Active {new Date(lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Compact stats row */}
          <div className="flex gap-2">
            {[
              { label: 'Created',  value: createdTasks.length,  color: spaceColor },
              { label: 'Done',     value: completedTasks.length, color: '#34d399' },
              { label: 'Edited',   value: modifiedTasks.length, color: '#8B5CF6' },
              { label: 'Rate',     value: `${completionRate}%`, color: '#6366F1' },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-slate-50 rounded-xl px-2 py-2 text-center">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className="text-base font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-5 pt-3 pb-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const count = tab.tasks ? tab.tasks.length : historyEvents.length
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === tab.id ? 'bg-accent-deep text-white' : 'text-slate-400 border border-black/10'
                }`}>
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-card-bg/20' : 'bg-slate-100 text-slate-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {activeTab === 'history' ? (
            <HistoryTimeline events={historyEvents} spaceColor={spaceColor} />
          ) : (
            <ProfileTaskSection
              tasks={TABS.find(t => t.id === activeTab)?.tasks || []}
              spaceColor={spaceColor}
              onOpenTask={onOpenTask}
              modifications={activeTab === 'modified' ? modifications : {}}
            />
          )}

          <button
            onClick={() => { onClose(); onNavigate?.('profile') }}
            className="w-full mt-5 py-3 rounded-2xl border-2 border-black/8 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            See Full Profile
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileTaskSection({ tasks, spaceColor, onOpenTask, modifications = {} }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No tasks here</p>
      </div>
    )
  }
  return (
    <div className="space-y-2 pt-2">
      {tasks.map(task => (
        <ProfileTaskCard
          key={task.id} task={task} spaceColor={spaceColor}
          modInfo={modifications[task.id] || null}
          onOpen={() => onOpenTask?.(task)}
        />
      ))}
    </div>
  )
}

function ProfileTaskCard({ task, spaceColor, modInfo, onOpen }) {
  const colors = getCategoryColor(task.category)
  return (
    <button
      onClick={onOpen}
      className="w-full bg-card-bg rounded-2xl flex items-stretch card-elevated overflow-hidden text-left transition-all active:scale-[0.99]"
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: modInfo ? '#8B5CF6' : colors.border }} />
      <div className="flex-1 px-3.5 py-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-tight flex-1 ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
            {task.task_name}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {modInfo && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Modified
              </span>
            )}
            {task.is_complete && (
              <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {task.due_date && <span className="text-slate-400 text-[10px]">{formatDueDate(task.due_date)}</span>}
          {task.assignee && <span className="text-accent-deep text-[10px] font-medium">→ {task.assignee}</span>}
        </div>
        {modInfo ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-purple-400 text-[9px] font-medium">
              {modInfo.changes.map(c =>
                typeof c === 'object' ? `${c.field} → "${c.to}"` : c
              ).join(' · ')}
            </span>
            <span className="text-slate-300 text-[9px]">·</span>
            <span className="text-slate-400 text-[9px]">{timeAgo(modInfo.at)}</span>
          </div>
        ) : (
          <p className="text-slate-300 text-[9px] mt-1.5">
            {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
    </button>
  )
}

function HistoryTimeline({ events, spaceColor }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No history yet</p>
      </div>
    )
  }

  const now = new Date()
  const todayStr     = now.toDateString()
  const yestStr      = new Date(now - 86400000).toDateString()
  const weekAgo      = new Date(now - 7 * 86400000)
  const groups       = {}
  const ORDER        = ['Today', 'Yesterday', 'This Week', 'Older']

  events.forEach(ev => {
    const ds = ev.date.toDateString()
    const key = ds === todayStr ? 'Today' : ds === yestStr ? 'Yesterday' : ev.date >= weekAgo ? 'This Week' : 'Older'
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  })

  return (
    <div className="pt-2 space-y-5">
      {ORDER.filter(k => groups[k]).map(groupKey => (
        <div key={groupKey}>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-3 px-1">{groupKey}</p>
          <div className="relative">
            <div className="absolute left-3.5 top-3 bottom-3 w-px bg-slate-100" />
            <div className="space-y-2.5">
              {groups[groupKey].map((ev, i) => {
                const col = getCategoryColor(ev.task.category)
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10"
                      style={{ backgroundColor: ev.color }}>
                      {ev.label === 'Completed' ? '✓' : ev.label === 'Created' ? '+' : '→'}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold" style={{ color: ev.color }}>{ev.label}</span>
                        <span className="text-slate-400 text-[9px] flex-shrink-0">{timeAgo(ev.date.toISOString())}</span>
                      </div>
                      <p className="text-slate-700 text-xs font-semibold mt-0.5 truncate">{ev.task.task_name}</p>
                      {ev.detail && (
                        <p className="text-[9px] mt-0.5" style={{ color: ev.color }}>{ev.detail}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: col.bg, color: col.text }}>
                          {ev.task.category}
                        </span>
                        {ev.task.due_date && (
                          <span className="text-slate-400 text-[9px]">{formatDueDate(ev.task.due_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Pin icon ──────────────────────────────────────────────────────────────────
function PinIcon({ filled = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptySpaces({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <img src={mascot} alt="Ollie" className="w-36 h-36 object-contain mb-2" style={{ mixBlendMode: 'multiply' }} />
      <p className="text-slate-500 text-sm mb-1">No spaces yet</p>
      <p className="text-slate-300 text-xs mb-5">Create a space to collaborate with your team</p>
      <button onClick={onCreate}
        className="bg-accent-deep hover:bg-accent-mid text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
        Create a Space
      </button>
    </div>
  )
}

// ── Kanban View ───────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'todo',       label: 'To Do',       color: '#64748b' },
  { id: 'inprogress', label: 'In Progress',  color: '#f59e0b' },
  { id: 'done',       label: 'Done',         color: '#10b981' },
]

function KanbanView({ tasks, members, spaceColor, themeColor, inProgressIds, modifications, onToggle, onClick, onMemberClick, onStatusChange, onDrop }) {
  const [draggedTask, setDraggedTask] = useState(null)
  const [draggedFrom, setDraggedFrom] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  const cols = {
    todo:       tasks.filter(t => !t.is_complete && !inProgressIds.has(t.id)),
    inprogress: tasks.filter(t => !t.is_complete &&  inProgressIds.has(t.id)),
    done:       tasks.filter(t =>  t.is_complete),
  }

  function onCardDragStart(task, colId) {
    setDraggedTask(task)
    setDraggedFrom(colId)
  }

  function onCardDragEnd() {
    setDraggedTask(null)
    setDraggedFrom(null)
    setDragOverCol(null)
  }

  function onColDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colId) setDragOverCol(colId)
  }

  function onColDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null)
  }

  function onColDrop(e, toColId) {
    e.preventDefault()
    if (draggedTask && draggedFrom !== toColId) {
      onDrop?.(draggedTask, toColId)
    }
    setDraggedTask(null)
    setDraggedFrom(null)
    setDragOverCol(null)
  }

  return (
    <div className="flex gap-3 px-4 pb-4" style={{ minWidth: `${KANBAN_COLS.length * 288 + 32}px` }}>
      {KANBAN_COLS.map(col => {
        const isOver = dragOverCol === col.id && draggedFrom !== col.id
        return (
          <div
            key={col.id}
            className="flex-shrink-0 w-72 flex flex-col rounded-2xl transition-all duration-200"
            style={isOver ? { backgroundColor: col.color + '14' } : undefined}
            onDragOver={e => onColDragOver(e, col.id)}
            onDragLeave={onColDragLeave}
            onDrop={e => onColDrop(e, col.id)}
          >
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full transition-transform duration-150" style={{ backgroundColor: col.color, transform: isOver ? 'scale(1.3)' : 'scale(1)' }} />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{col.label}</span>
              <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">{cols[col.id].length}</span>
            </div>
            <div className={`flex flex-col gap-2 flex-1 min-h-[100px] rounded-xl p-1.5 transition-all duration-200 ${isOver ? 'ring-2 ring-dashed' : ''}`}
              style={isOver ? { ringColor: col.color + '60' } : undefined}>
              {cols[col.id].map(task => (
                <KanbanCard
                  key={task.id} task={task} members={members}
                  themeColor={themeColor} columnId={col.id}
                  modification={modifications?.[task.id] || null}
                  isDragging={draggedTask?.id === task.id}
                  onClick={() => !draggedTask && onClick(task)}
                  onMemberClick={onMemberClick}
                  onStatusChange={newStatus => onStatusChange(task, newStatus)}
                  onDragStart={() => onCardDragStart(task, col.id)}
                  onDragEnd={onCardDragEnd}
                />
              ))}
              {cols[col.id].length === 0 && (
                <div
                  className={`flex-1 border-2 border-dashed rounded-2xl flex items-center justify-center py-8 transition-all duration-200 ${isOver ? 'border-current scale-[1.01]' : 'border-slate-100'}`}
                  style={isOver ? { borderColor: col.color + '80', backgroundColor: col.color + '10' } : undefined}
                >
                  <p className="text-xs font-medium" style={isOver ? { color: col.color } : { color: '#cbd5e1' }}>
                    {isOver ? '↓ Drop here' : 'Empty'}
                  </p>
                </div>
              )}
              {/* Drop zone hint when col has cards and is hovered */}
              {isOver && cols[col.id].length > 0 && (
                <div className="h-12 border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-150"
                  style={{ borderColor: col.color + '60', backgroundColor: col.color + '08' }}>
                  <p className="text-[10px] font-medium" style={{ color: col.color }}>↓ Drop here</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ task, members, themeColor, columnId, modification, onClick, onMemberClick, onStatusChange, isDragging, onDragStart, onDragEnd }) {
  const [showStatus, setShowStatus] = useState(false)
  const colors = getCategoryColor(task.category)
  const creator = members.find(m => m.user_id === task.user_id)
  const creatorName = creator?.display_name || null
  const rawAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined') ? task.assignee : null
  const assignee = rawAssignee || creatorName
  const currentCol = KANBAN_COLS.find(c => c.id === columnId)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); onDragStart?.() }}
      onDragEnd={onDragEnd}
      className={`rounded-2xl p-3 card-elevated transition-all duration-200 select-none ${
        isDragging
          ? 'opacity-40 scale-95 rotate-1 cursor-grabbing shadow-xl'
          : 'cursor-grab active:cursor-grabbing active:scale-[0.98] hover:shadow-lg'
      }`}
      style={{ backgroundColor: themeColor ? themeColor + '28' : '#ffffff' }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={e => { e.stopPropagation(); setShowStatus(v => !v) }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: currentCol?.color }}
        >
          {currentCol?.label}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text }}>
          {task.category}
        </span>
      </div>
      {showStatus && (
        <div className="mb-2 flex gap-1.5 flex-wrap">
          {KANBAN_COLS.filter(c => c.id !== columnId).map(c => (
            <button key={c.id}
              onClick={e => { e.stopPropagation(); onStatusChange(c.id); setShowStatus(false) }}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: c.color }}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <p className={`text-sm font-semibold leading-tight mb-1.5 ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
        {task.task_name}
      </p>
      {modification && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edited
          </span>
          <p className="text-purple-400 text-[9px] mt-0.5 truncate leading-tight">
            {modification.changes.map(c => typeof c === 'object' ? `${c.field} → "${c.to}"` : c).join(' · ')}
          </p>
        </div>
      )}
      <div className="flex items-end justify-between">
        <div>
          {task.due_date && <p className="text-[10px] text-slate-400">{formatDueDate(task.due_date)}</p>}
          <p className="text-[9px] text-slate-300 mt-0.5">
            {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center">
          {assignee && (
            <button onClick={e => { e.stopPropagation(); onMemberClick?.(assignee) }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white"
              style={{ backgroundColor: memberColor(assignee) }}>
              {assignee[0].toUpperCase()}
            </button>
          )}
          {creatorName && creatorName !== assignee && (
            <button onClick={e => { e.stopPropagation(); onMemberClick?.(creatorName) }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white -ml-1.5"
              style={{ backgroundColor: memberColor(creatorName) }}>
              {creatorName[0].toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Member View ───────────────────────────────────────────────────────────────
function MemberView({ tasks, members, inProgressIds, modifications, spaceColor, themeColor, onMemberClick, onTaskClick }) {
  const [memberSort, setMemberSort] = useState('active')
  const [collapsed, setCollapsed] = useState({})

  const memberData = members.map(m => {
    const name = m.display_name || ''
    const assigned = tasks.filter(t => {
      const raw = (t.assignee && t.assignee !== 'null' && t.assignee !== 'undefined') ? t.assignee : null
      const effective = raw || members.find(mx => mx.user_id === t.user_id)?.display_name
      return effective?.toLowerCase() === name.toLowerCase()
    })
    const completed  = assigned.filter(t => t.is_complete).length
    const inProgress = assigned.filter(t => inProgressIds.has(t.id) && !t.is_complete).length
    const overdue    = assigned.filter(t => t.due_date && !t.is_complete && new Date(t.due_date) < new Date()).length
    const lastActive = assigned.reduce((latest, t) => {
      const d = new Date(modifications[t.id]?.at || t.updated_at || t.created_at)
      return d > latest ? d : latest
    }, new Date(0))
    return { member: m, name, tasks: assigned, completed, inProgress, overdue, lastActive }
  })

  const sorted = [...memberData].sort((a, b) => {
    if (memberSort === 'completed') return b.completed - a.completed
    if (memberSort === 'overdue')   return b.overdue - a.overdue
    if (memberSort === 'recent')    return b.lastActive - a.lastActive
    return b.tasks.length - a.tasks.length
  })

  const SORT_OPTIONS = [
    { id: 'active',    label: 'Most Active' },
    { id: 'completed', label: 'Most Done' },
    { id: 'overdue',   label: 'Overdue' },
    { id: 'recent',    label: 'Recently Active' },
  ]

  return (
    <div className="px-4 pb-2 space-y-3">
      {/* Sort bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <span className="text-slate-400 text-[10px] font-semibold flex-shrink-0">Sort:</span>
        {SORT_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => setMemberSort(opt.id)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              memberSort === opt.id ? 'bg-accent-deep text-white' : 'border border-black/10 text-slate-400'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {sorted.map(({ member, name, tasks: memberTasks, completed, inProgress, overdue }) => {
        const isCollapsed = !!collapsed[member.user_id]
        const completionRate = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0
        return (
          <div key={member.user_id} className="rounded-2xl overflow-hidden card-elevated"
            style={{ backgroundColor: themeColor ? themeColor + '18' : '#ffffff' }}>

            {/* Section header — tap to collapse */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setCollapsed(prev => ({ ...prev, [member.user_id]: !prev[member.user_id] }))}
            >
              {/* Avatar — tapping opens profile */}
              <button
                onClick={e => { e.stopPropagation(); onMemberClick?.(name) }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-transform active:scale-90"
                style={{ backgroundColor: memberColor(name) }}
              >
                {name[0]?.toUpperCase() || '?'}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-slate-800 font-bold text-sm truncate">{name}</p>
                  <span className="text-[10px] text-slate-400">{memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}</span>
                  {memberTasks.length > 0 && (
                    <span className="text-[10px] font-semibold text-accent-deep">{completionRate}%</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {completed > 0  && <span className="text-emerald-500 text-[10px] font-semibold">✓ {completed} done</span>}
                  {inProgress > 0 && <span className="text-amber-500  text-[10px] font-semibold">↻ {inProgress} in progress</span>}
                  {overdue > 0    && <span className="text-red-400    text-[10px] font-semibold">⚠ {overdue} overdue</span>}
                </div>
                {/* Progress bar */}
                {memberTasks.length > 0 && (
                  <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%`, backgroundColor: memberColor(name) }} />
                  </div>
                )}
              </div>

              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`text-slate-300 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Task cards */}
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2">
                {memberTasks.length === 0 ? (
                  <p className="text-slate-300 text-xs text-center py-4">No tasks assigned</p>
                ) : (
                  memberTasks.map(task => (
                    <MemberTaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      inProgressIds={inProgressIds}
                      modification={modifications?.[task.id] || null}
                      themeColor={themeColor}
                      onClick={() => onTaskClick?.(task)}
                      onMemberClick={onMemberClick}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MemberTaskCard({ task, members, inProgressIds, modification, themeColor, onClick, onMemberClick }) {
  const colors    = getCategoryColor(task.category)
  const creator   = members.find(m => m.user_id === task.user_id)
  const creatorName = creator?.display_name || null
  const rawAssignee = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined') ? task.assignee : null
  const assignee  = rawAssignee || creatorName
  const status    = task.is_complete ? 'done' : inProgressIds.has(task.id) ? 'inprogress' : 'todo'
  const statusCol = KANBAN_COLS.find(c => c.id === status)
  const isOverdue = task.due_date && !task.is_complete && new Date(task.due_date) < new Date()

  return (
    <button onClick={onClick}
      className="w-full rounded-xl flex items-stretch overflow-hidden text-left transition-all active:scale-[0.99] card-elevated"
      style={{ backgroundColor: themeColor ? themeColor + '28' : '#f8fafc' }}
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: modification ? '#8B5CF6' : colors.border }} />
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-tight flex-1 ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
            {task.task_name}
          </p>
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: statusCol?.color }}>
            {statusCol?.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {task.due_date && (
            <span className={`text-[9px] font-medium ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
              {isOverdue ? '⚠ ' : ''}{formatDueDate(task.due_date)}
            </span>
          )}
          {modification && (
            <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">Modified</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-slate-300 text-[9px]">
            {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {creatorName && assignee !== creatorName && (
            <button onClick={e => { e.stopPropagation(); onMemberClick?.(creatorName) }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 transition-transform active:scale-90"
              style={{ backgroundColor: memberColor(creatorName) }}>
              {creatorName[0].toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Table View ────────────────────────────────────────────────────────────────
function TableView({ tasks, members, themeColor, inProgressIds, modifications, onToggle, onClick, onMemberClick, onStatusChange }) {
  const headerBg = themeColor ? themeColor + '30' : '#f8fafc'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
        <thead>
          <tr style={{ backgroundColor: headerBg }}>
            {['', 'Task', 'Status', 'Assignee', 'Reporter', 'Created', 'Updated', 'Due'].map((h, i) => (
              <th key={i} className={`py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-black/8 ${i === 0 ? 'w-10 px-4' : 'px-3'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center text-slate-300 text-sm">No tasks</td>
            </tr>
          ) : tasks.map(task => (
            <TableRow
              key={task.id}
              task={task}
              members={members}
              themeColor={themeColor}
              columnId={task.is_complete ? 'done' : inProgressIds.has(task.id) ? 'inprogress' : 'todo'}
              modification={modifications?.[task.id] || null}
              onToggle={() => onToggle(task)}
              onClick={() => onClick(task)}
              onMemberClick={onMemberClick}
              onStatusChange={newStatus => onStatusChange(task, newStatus)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({ task, members, themeColor, columnId, modification, onToggle, onClick, onMemberClick, onStatusChange }) {
  const [showStatus, setShowStatus] = useState(false)
  const colors  = getCategoryColor(task.category)
  const creator = members.find(m => m.user_id === task.user_id)
  const creatorName  = creator?.display_name || null
  const rawAssignee  = (task.assignee && task.assignee !== 'null' && task.assignee !== 'undefined') ? task.assignee : null
  const assignee     = rawAssignee || creatorName
  const currentCol   = KANBAN_COLS.find(c => c.id === columnId)
  const updatedAt    = modification?.at || task.updated_at || task.created_at
  const isOverdue    = task.due_date && !task.is_complete && new Date(task.due_date) < new Date()
  const rowBg        = themeColor ? themeColor + '10' : undefined

  return (
    <tr
      className="group border-b border-black/[0.04] cursor-pointer transition-colors hover:brightness-95"
      style={rowBg ? { backgroundColor: rowBg } : {}}
      onClick={onClick}
    >
      {/* Check */}
      <td className="py-3 px-4 w-10" onClick={e => { e.stopPropagation(); onToggle() }}>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mx-auto ${
          task.is_complete ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 group-hover:border-slate-300'
        }`}>
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </td>

      {/* Task */}
      <td className="py-3 px-3 max-w-[180px]">
        <p className={`text-sm font-medium leading-tight truncate ${task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'}`}>
          {task.task_name}
        </p>
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block"
            style={{ backgroundColor: colors.bg, color: colors.text }}>
            {task.category}
          </span>
          {modification && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modified
            </span>
          )}
        </div>
        {modification && (
          <p className="text-purple-400 text-[9px] mt-0.5 truncate">
            {modification.changes.map(c => typeof c === 'object' ? `${c.field} → "${c.to}"` : c).join(' · ')}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-3 w-28" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setShowStatus(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white whitespace-nowrap"
            style={{ backgroundColor: currentCol?.color }}
          >
            {currentCol?.label}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showStatus && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-xl border border-black/8 overflow-hidden min-w-[120px]">
              {KANBAN_COLS.filter(c => c.id !== columnId).map(c => (
                <button key={c.id}
                  onClick={() => { onStatusChange(c.id); setShowStatus(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs font-medium text-slate-700">{c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Assignee */}
      <td className="py-3 px-3 w-28">
        {assignee && (
          <button onClick={e => { e.stopPropagation(); onMemberClick?.(assignee) }}
            className="flex items-center gap-1.5 group/av">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ backgroundColor: memberColor(assignee) }}>
              {assignee[0].toUpperCase()}
            </div>
            <span className="text-xs text-slate-500 truncate max-w-[56px] group-hover/av:text-accent-deep transition-colors">{assignee}</span>
          </button>
        )}
      </td>

      {/* Reporter */}
      <td className="py-3 px-3 w-28">
        {creatorName && (
          <button onClick={e => { e.stopPropagation(); onMemberClick?.(creatorName) }}
            className="flex items-center gap-1.5 group/av">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ backgroundColor: memberColor(creatorName) }}>
              {creatorName[0].toUpperCase()}
            </div>
            <span className="text-xs text-slate-500 truncate max-w-[56px] group-hover/av:text-accent-deep transition-colors">{creatorName}</span>
          </button>
        )}
      </td>

      {/* Created */}
      <td className="py-3 px-3 w-24">
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </td>

      {/* Updated */}
      <td className="py-3 px-3 w-24">
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </td>

      {/* Due */}
      <td className="py-3 px-3 w-24">
        {task.due_date ? (
          <span className={`text-xs font-medium whitespace-nowrap ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="text-slate-200 text-xs">—</span>
        )}
      </td>
    </tr>
  )
}

// ── Space Details Modal ───────────────────────────────────────────────────────
function SpaceDetailsModal({ tasks, members, spaceColor, onClose }) {
  const total     = tasks.length
  const completed = tasks.filter(t => t.is_complete).length
  const pending   = total - completed
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0

  const catStats = ['Work','Personal','School','Errands','Health'].map(cat => {
    const ct = tasks.filter(t => t.category === cat)
    return { cat, total: ct.length, done: ct.filter(t => t.is_complete).length }
  }).filter(s => s.total > 0)

  const memberStats = members.map(m => {
    const assigned = tasks.filter(t =>
      t.assignee?.toLowerCase() === m.display_name?.toLowerCase() ||
      (!t.assignee && t.user_id === m.user_id)
    )
    return { name: m.display_name, total: assigned.length, done: assigned.filter(t => t.is_complete).length }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-6 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-slate-900 font-bold text-lg">Space Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-8 space-y-5">
          {/* Overview */}
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Total', value: total, color: spaceColor }, { label: 'Done', value: completed, color: '#10b981' }, { label: 'Pending', value: pending, color: '#f59e0b' }].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Overall progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Overall Progress</span>
              <span className="text-slate-700 text-xs font-bold">{rate}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, backgroundColor: spaceColor }} />
            </div>
          </div>
          {/* By category */}
          {catStats.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">By Category</p>
              <div className="space-y-3">
                {catStats.map(s => {
                  const col = getCategoryColor(s.cat)
                  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
                  return (
                    <div key={s.cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: col.text }}>{s.cat}</span>
                        <span className="text-slate-400 text-xs">{s.done}/{s.total} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: col.border }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Member contributions */}
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">Member Contributions</p>
            <div className="space-y-3">
              {memberStats.map(s => {
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: memberColor(s.name) }}>
                      {(s.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-700 truncate">{s.name}</span>
                        <span className="text-slate-400 text-[10px] ml-2 flex-shrink-0">{s.done}/{s.total}</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: memberColor(s.name) }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
