import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import { formatDueDate, getDateGroup } from '../lib/utils'
import {
  BUILT_IN_CATEGORIES,
  getCategoryColor,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../lib/categories'
import { parseTask, isChecklist, getChecklistItems } from '../lib/ai'
import { BUILT_IN_ICON_MAP, ICON_PATHS, ICON_LIST, CategoryIcon } from '../lib/icons'
import mascot from '../mascots/home-mascot.png'

const DATE_GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'Done']

const COLOR_OPTIONS = [
  '#a855f7','#f97316','#22c55e','#ec4899',
  '#ef4444','#eab308','#14b8a6','#6366f1',
  '#f43f5e','#0ea5e9','#84cc16','#f59e0b',
]

export default function TasksScreen({
  tasks, onTaskUpdated, onOpenTask, onNavigate,
  session, displayName, categories, onCategoriesChanged, onTaskCreated, onTasksChanged,
}) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [collapsed, setCollapsed]           = useState({})
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [categoryToEdit, setCategoryToEdit]   = useState(null)
  const [input, setInput]     = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseCard, setParseCard] = useState(null)
  const [parseError, setParseError] = useState('')
  const inputRef = useRef(null)

  const allCategories = [...BUILT_IN_CATEGORIES, ...categories]
  const openCount = tasks.filter(t => !t.is_complete).length

  const isCustomCategory = name => categories.some(cat => cat.name === name)

  function handleRequestEditCategory(cat, taskCount) {
    setCategoryToEdit({ ...cat, taskCount })
  }

  async function handleEditCategory(values) {
    const oldName = categoryToEdit.name
    const newName = values.name.trim()
    let resultData

    if (categoryToEdit.id) {
      const { data, error } = await updateCategory(categoryToEdit.id, { ...values, name: newName })
      if (error) return { error: 'Could not save changes. Try again.' }
      resultData = data
    } else {
      // Built-in category: create a user override that getCategoryColor will pick up
      const { data, error } = await createCategory(session.user.id, { name: newName, color: values.color, emoji: values.emoji })
      if (error) return { error: 'Could not save changes. Try again.' }
      resultData = data
    }

    if (newName !== oldName) {
      const { error: moveError } = await supabase
        .from('tasks').update({ category: newName })
        .eq('user_id', session.user.id).eq('category', oldName)
      if (moveError) { await onCategoriesChanged?.(); return { error: 'Saved category, but could not update its tasks.' } }
    }
    await onCategoriesChanged?.()
    await onTasksChanged?.()
    if (activeCategory?.name === oldName) setActiveCategory(prev => ({ ...prev, name: newName }))
    setCategoryToEdit(null)
    return { data: resultData }
  }

  async function handleDeleteCategory() {
    if (!categoryToEdit?.id) return { error: 'Could not find this category.' }
    const tasksInCategory = tasks.filter(t => t.category === categoryToEdit.name)
    if (tasksInCategory.length > 0) {
      const { error: moveError } = await supabase
        .from('tasks').update({ category: 'Personal' })
        .eq('user_id', session.user.id).eq('category', categoryToEdit.name)
      if (moveError) return { error: 'Could not move tasks to Personal. Try again.' }
    }
    const { error } = await deleteCategory(categoryToEdit.id)
    if (error) return { error: 'Could not delete category. Try again.' }
    await onCategoriesChanged?.()
    await onTasksChanged?.()
    if (activeCategory?.name === categoryToEdit.name) setActiveCategory(null)
    setCategoryToEdit(null)
    return { data: true }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || parsing) return
    setParseError('')
    setParsing(true)
    setParseCard(null)
    try {
      const parsed = await parseTask(trimmed)
      setParseCard({ raw: trimmed, ...parsed, category: activeCategory?.name || parsed.category || 'Personal' })
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
      user_id: session.user.id, content: parseCard.raw, task_name: parseCard.task,
      due_date: parseCard.due_date || null, category: parseCard.category || 'Personal',
      assignee: parseCard.assignee || null,
    }).select().single()
    if (!error && data) onTaskCreated?.(data)
    else onTaskCreated?.({
      id: crypto.randomUUID(), user_id: session.user.id, space_id: null,
      content: parseCard.raw, task_name: parseCard.task,
      due_date: parseCard.due_date || null, category: parseCard.category || 'Personal',
      assignee: parseCard.assignee || null, is_complete: false,
      created_at: new Date().toISOString(),
    })
    setParseCard(null); setInput(''); setParseError('')
  }

  function handleEditField(field, value) { setParseCard(prev => ({ ...prev, [field]: value })) }

  // ── Folder view ────────────────────────────────────────────────────────────
  if (!activeCategory) {
    const folders = allCategories.map(cat => ({
      ...cat,
      taskCount: tasks.filter(t => t.category === cat.name).length,
    }))
    const withTasks   = folders.filter(f => f.taskCount > 0)
    const emptyCustom = categories.filter(c => !withTasks.find(f => f.name === c.name))

    return (
      <div className="flex flex-col min-h-screen bg-app-bg">
        <ScreenHeader>
          <div>
            <h1 className="text-slate-900 font-bold text-2xl">Your Tasks</h1>
            <p className="text-slate-400 text-xs mt-0.5">{openCount} task{openCount !== 1 ? 's' : ''} open across categories</p>
          </div>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </ScreenHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
          <div className="space-y-3">
            {withTasks.map(folder => {
              const colors = getCategoryColor(folder.name, categories)
              return (
                <button key={folder.name} onClick={() => setActiveCategory(folder)} className="w-full bg-card-bg rounded-2xl p-4 card-elevated flex items-center gap-4 transition-all active:scale-[0.99] text-left">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: colors.border }}>
                    <CategoryIcon name={folder.name} iconId={folder.emoji} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-base truncate">{folder.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{folder.taskCount} task{folder.taskCount !== 1 ? 's' : ''}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200 shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )
            })}

            {emptyCustom.map(cat => {
              const colors = getCategoryColor(cat.name, categories)
              return (
                <button key={cat.name} onClick={() => setActiveCategory(cat)} className="w-full bg-card-bg/40 rounded-2xl p-4 border border-dashed border-divider flex items-center gap-4 transition-all active:scale-[0.99] text-left">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 opacity-40" style={{ backgroundColor: colors.border }}>
                    <CategoryIcon name={cat.name} iconId={cat.emoji} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 font-semibold text-base truncate">{cat.name}</p>
                    <p className="text-slate-300 text-xs mt-0.5">No tasks yet</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200 shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )
            })}

            {withTasks.length === 0 && emptyCustom.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <img src={mascot} alt="" className="w-24 h-24 object-contain mb-3 opacity-60" />
                <p className="text-slate-400 text-sm font-medium">No tasks yet</p>
                <p className="text-slate-300 text-xs mt-1">Add tasks from Home to get started</p>
              </div>
            )}

            <button
              onClick={() => setShowNewCategory(true)}
              className="w-full bg-transparent border-2 border-dashed border-divider rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.99] hover:border-accent-deep/30"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-divider flex items-center justify-center text-slate-300 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-slate-400 font-semibold text-sm">New Category</p>
                <p className="text-slate-300 text-xs">Customize with logo &amp; color</p>
              </div>
            </button>
          </div>
        </div>

        {showNewCategory && (
          <NewCategoryModal
            session={session}
            categories={categories}
            onCreated={() => { setShowNewCategory(false); onCategoriesChanged() }}
            onCancel={() => setShowNewCategory(false)}
          />
        )}
        {categoryToEdit && (
          <NewCategoryModal
            session={session}
            category={categoryToEdit}
            categories={categories}
            onSaveCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onCancel={() => setCategoryToEdit(null)}
          />
        )}
      </div>
    )
  }

  // ── Category detail view ───────────────────────────────────────────────────
  const catTasks = tasks.filter(t => t.category === activeCategory.name)
  const grouped  = {}
  for (const task of catTasks) {
    const group = task.is_complete ? 'Done' : getDateGroup(task.due_date)
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(task)
  }
  const colors = getCategoryColor(activeCategory.name, categories)

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => { setActiveCategory(null); setParseCard(null); setInput('') }}
            className="flex items-center gap-1.5 text-accent-deep text-sm font-medium mb-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            All Categories
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: colors.border }}>
              <CategoryIcon name={activeCategory.name} iconId={activeCategory.emoji} />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-2xl">{activeCategory.name}</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {catTasks.filter(t => !t.is_complete).length} pending · {catTasks.filter(t => t.is_complete).length} done
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleRequestEditCategory(activeCategory, catTasks.length)}
          className="mt-10 w-12 h-12 rounded-full flex items-center justify-center text-slate-300 hover:text-accent-deep hover:bg-accent-pale transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </button>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto px-5 pb-44 pt-4 space-y-5">
        {catTasks.length === 0 ? (
          <EmptyCategory onNavigate={onNavigate} />
        ) : (
          DATE_GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <section key={group}>
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))}
                className="flex items-center gap-2 w-full mb-2.5"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${group === 'Overdue' ? 'bg-red-500' : group === 'Done' ? 'bg-slate-200' : 'bg-slate-800'}`} />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${
                  group === 'Overdue' ? 'text-red-500' : group === 'Done' ? 'text-slate-300' : 'text-slate-800'
                }`}>{group}</span>
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {String(grouped[group].length).padStart(2, '0')}
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

      <div className="fixed bottom-20 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="bg-card-bg rounded-2xl p-4 card-elevated-lg animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.text }}>AI Parsed · {activeCategory.name}</span>
              {parseError && <p className="text-amber-500 text-[10px]">{parseError}</p>}
            </div>
            <div className="space-y-2.5 mb-3">
              <input type="text" value={parseCard.task}
                onChange={e => handleEditField('task', e.target.value)}
                className="w-full bg-transparent text-slate-900 text-xl font-bold outline-none border-b-2 border-slate-200 focus:border-accent-deep pb-1.5 transition-colors placeholder:text-slate-300"
                placeholder="Task name"
              />
              <div>
                <p className="text-slate-400 text-[10px] font-semibold mb-1">Due Date</p>
                <input type="datetime-local"
                  value={parseCard.due_date ? parseCard.due_date.slice(0, 16) : ''}
                  onChange={e => handleEditField('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-2 outline-none border border-black/10 focus:border-accent-deep"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setParseCard(null); setParseError('') }}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-slate-500 text-sm font-medium">Cancel</button>
              <button onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors active:opacity-90"
                style={{ backgroundColor: colors.border }}>
                Add to {activeCategory.name}
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 bg-card-bg rounded-2xl px-4 py-3 card-elevated">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
            placeholder={`Add a task to ${activeCategory.name}…`}
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button onClick={handleSend} disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-colors disabled:opacity-40 active:opacity-80 shrink-0"
            style={{ backgroundColor: colors.border }}
          >
            {parsing
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            }
          </button>
        </div>
      </div>

      {categoryToEdit && (
        <NewCategoryModal
          session={session}
          category={categoryToEdit}
          categories={categories}
          onSaveCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onCancel={() => setCategoryToEdit(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterPill({ label, active, color, onClick, onEdit }) {
  return (
    <div className={`shrink-0 flex items-center rounded-full text-xs font-semibold transition-colors ${
      active ? 'bg-accent-deep text-white' : 'bg-white text-slate-500 border border-black/10'
    }`}>
      <button onClick={onClick} className="flex items-center gap-1.5 pl-3.5 pr-2 py-1.5">
        {color && !active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        {label}
      </button>
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className={`pr-2.5 py-1.5 transition-colors ${active ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-500'}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────


function TaskCard({ task, colors, onToggle, onOpen }) {
  return (
    <div className="bg-card-bg rounded-2xl flex items-center card-elevated transition-all overflow-hidden active:scale-[0.99]">
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colors.border }} />
      <button onClick={onOpen} className="flex-1 py-3.5 pl-3 text-left min-w-0">
        <p className={`text-sm font-semibold leading-tight truncate ${
          task.is_complete ? 'line-through text-slate-300' : 'text-slate-800'
        }`}>
          {task.task_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-bold font-mono" style={{ color: colors.text }}>{task.category}</span>
          <span className="text-slate-300 text-[10px]">·</span>
          {task.due_date ? (
            <span className={`text-xs font-mono ${
              getDateGroup(task.due_date) === 'Overdue' && !task.is_complete ? 'text-red-500' : 'text-slate-400'
            }`}>
              {formatDueDate(task.due_date)}
            </span>
          ) : (
            <span className="text-slate-300 text-xs font-mono">No due date</span>
          )}
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
      </button>
      <button onClick={onToggle} className="w-11 h-11 flex items-center justify-center shrink-0">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.is_complete ? 'bg-accent-deep border-accent-deep' : 'border-slate-200'
        }`}>
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </button>
    </div>
  )
}

function NewCategoryModal({ session, category, categories = [], onCreated, onSaveCategory, onDeleteCategory, onCancel }) {
  const isEditing = Boolean(category)
  const [name,   setName]   = useState(category?.name || '')
  const [iconId, setIconId] = useState(
    ICON_PATHS[category?.emoji] ? category.emoji : (BUILT_IN_ICON_MAP[category?.name] || 'tag')
  )
  const [color,  setColor]  = useState(category?.color || '#a855f7')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error,  setError]  = useState('')
  const [visible, setVisible] = useState(false)
  const sheetRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleClose(cb) {
    if (sheetRef.current) { sheetRef.current.style.transform = ''; sheetRef.current.style.transition = '' }
    setVisible(false)
    setTimeout(cb, 280)
  }

  function onDragStart(e) {
    drag.current = { startY: e.touches[0].clientY, delta: 0 }
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  function onDragMove(e) {
    if (!drag.current) return
    const delta = Math.max(0, e.touches[0].clientY - drag.current.startY)
    drag.current.delta = delta
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`
  }

  function onDragEnd(fallbackCb) {
    if (!drag.current) return
    const { delta } = drag.current
    drag.current = null
    if (delta < 8 || delta > 90) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.28s ease-out'
        sheetRef.current.style.transform = 'translateY(100%)'
      }
      setTimeout(fallbackCb, 280)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease-out'
        sheetRef.current.style.transform = 'translateY(0)'
        setTimeout(() => { if (sheetRef.current) sheetRef.current.style.transition = '' }, 250)
      }
    }
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return

    const duplicateBuiltIn = BUILT_IN_CATEGORIES.some(cat => cat.name.toLowerCase() === trimmed.toLowerCase())
    const duplicateCustom = categories.some(cat =>
      cat.id !== category?.id && cat.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicateBuiltIn || duplicateCustom) {
      setError('A category with this name already exists.')
      return
    }

    setSaving(true)
    setError('')
    const result = isEditing
      ? await onSaveCategory?.({ name: trimmed, color, emoji: iconId })
      : await createCategory(session.user.id, { name: trimmed, color, emoji: iconId })
    setSaving(false)
    const err = result?.error
    if (err) { setError('Could not save — try again.'); return }
    if (isEditing) handleClose(onCancel)
    else handleClose(onCreated)
  }

  async function handleDelete() {
    if (!isEditing || deleting) return
    setDeleting(true)
    setError('')
    const result = await onDeleteCategory?.()
    setDeleting(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    handleClose(onCancel)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end backdrop-blur-sm transition-colors duration-300 ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={e => {
        if (e.target !== e.currentTarget || saving || deleting) return
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else handleClose(onCancel)
      }}
    >
      <div ref={sheetRef} className={`w-full bg-card-bg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div
          className="flex justify-center -mt-2 mb-4 touch-none select-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={() => onDragEnd(onCancel)}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        <h2 className="text-slate-900 font-bold text-lg mb-5">
          {isEditing ? 'Edit Category' : 'New Category'}
        </h2>

        {/* Live preview */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
            <CategoryIcon name={category?.name} iconId={iconId} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-bold text-base truncate">{name || 'Category name'}</p>
            <p className="text-slate-400 text-xs">
              {isEditing ? `${category.taskCount || 0} task${category.taskCount !== 1 ? 's' : ''}` : '0 tasks'}
            </p>
          </div>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
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

        {/* Logo */}
        <div className="mb-4">
          <p className="text-slate-500 text-xs font-semibold mb-1.5">LOGO</p>
          <div className="flex flex-wrap gap-2">
            {ICON_LIST.map(id => (
              <button
                key={id}
                onClick={() => setIconId(id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  iconId === id ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                }`}
                style={iconId === id ? { backgroundColor: color } : {}}
              >
                <CategoryIcon name="" iconId={id} size={16} color={iconId === id ? 'white' : '#64748b'} />
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
            onClick={() => handleClose(onCancel)}
            disabled={saving || deleting}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving || deleting}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40 transition-colors active:bg-accent-mid"
          >
            {saving
              ? (isEditing ? 'Saving…' : 'Creating…')
              : (isEditing ? 'Save Changes' : 'Create Category')}
          </button>
        </div>

        {isEditing && category?.id && (
          <button
            onClick={() => { setError(''); setShowDeleteConfirm(true) }}
            disabled={saving || deleting}
            className="w-full mt-3 py-3 rounded-xl border border-black/10 text-slate-400 text-sm font-medium transition-colors hover:text-red-500 hover:border-red-200 disabled:opacity-50"
          >
            {deleting
              ? 'Deleting…'
              : showDeleteConfirm
                ? `Tap again to delete${category.taskCount ? ` and move ${category.taskCount} task${category.taskCount !== 1 ? 's' : ''}` : ''}`
                : 'Delete Category'}
          </button>
        )}
      </div>
      {showDeleteConfirm && (
        <DeleteCategoryConfirmSheet
          category={category}
          deleting={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function DeleteCategoryConfirmSheet({ category, deleting, onCancel, onConfirm }) {
  const taskCount = category.taskCount || 0
  const [visible, setVisible] = useState(false)
  const sheetRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleClose() {
    if (sheetRef.current) { sheetRef.current.style.transform = ''; sheetRef.current.style.transition = '' }
    setVisible(false)
    setTimeout(onCancel, 280)
  }

  function onDragStart(e) {
    drag.current = { startY: e.touches[0].clientY, delta: 0 }
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  function onDragMove(e) {
    if (!drag.current) return
    const delta = Math.max(0, e.touches[0].clientY - drag.current.startY)
    drag.current.delta = delta
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`
  }

  function onDragEnd() {
    if (!drag.current) return
    const { delta } = drag.current
    drag.current = null
    if (delta > 90) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.28s ease-out'
        sheetRef.current.style.transform = 'translateY(100%)'
      }
      setTimeout(onCancel, 280)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease-out'
        sheetRef.current.style.transform = 'translateY(0)'
        setTimeout(() => { if (sheetRef.current) sheetRef.current.style.transition = '' }, 250)
      }
    }
  }

  return (
    <div
      className={`fixed inset-0 z-60 flex items-end backdrop-blur-sm transition-colors duration-300 ${visible ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={e => { if (e.target === e.currentTarget && !deleting) handleClose() }}
    >
      <div ref={sheetRef} className={`w-full bg-card-bg rounded-t-3xl p-6 shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div
          className="flex justify-center -mt-2 mb-4 touch-none select-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v5"/>
            <path d="M14 11v5"/>
          </svg>
        </div>

        <h3 className="text-slate-900 font-bold text-lg mb-1">Delete {category.name}?</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-5">
          {taskCount > 0
            ? `${taskCount} task${taskCount !== 1 ? 's' : ''} will move to Personal before this category is deleted.`
            : 'This empty category will be permanently removed.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-colors active:bg-red-600"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ADD_CAT_COLORS = ['#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#06B6D4','#6366F1']

function AddCategoryButton({ session, categories, onCreated }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')

  async function handleAdd() {
    if (!val.trim() || !session) return
    const color = ADD_CAT_COLORS[Math.floor(Math.random() * ADD_CAT_COLORS.length)]
    const { error } = await createCategory(session.user.id, { name: val.trim(), color, emoji: '📁' })
    if (!error) onCreated?.(val.trim())
    setAdding(false); setVal('')
  }

  if (adding) return (
    <div className="flex gap-1.5 items-center w-full mt-1">
      <input
        type="text" value={val} onChange={e => setVal(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setVal('') } }}
        placeholder="New category..." className="flex-1 bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 outline-none border border-black/10 focus:border-accent-deep"
      />
      <button onClick={handleAdd} disabled={!val.trim()} className="px-2.5 py-1.5 rounded-xl bg-accent-deep text-white text-xs font-bold disabled:opacity-40">Add</button>
      <button onClick={() => { setAdding(false); setVal('') }} className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs">✕</button>
    </div>
  )

  return (
    <button type="button" onClick={() => setAdding(true)}
      className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-accent-pale hover:text-accent-deep text-base font-medium transition-colors"
    >+</button>
  )
}

function EmptyCategory({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
      <img src={mascot} alt="Lista" className="w-24 h-24 object-contain mb-2 opacity-70" />
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
