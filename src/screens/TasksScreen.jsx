import { useState, useRef } from 'react'
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
import mascot from '../mascots/home-mascot.png'

const DATE_GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'Done']

const COLOR_OPTIONS = [
  '#a855f7','#f97316','#22c55e','#ec4899',
  '#ef4444','#eab308','#14b8a6','#6366f1',
  '#f43f5e','#0ea5e9','#84cc16','#f59e0b',
]

const BUILT_IN_ICON_MAP = { School: 'book', Work: 'briefcase', Personal: 'person', Errands: 'bag', Health: 'heart' }

const ICON_PATHS = {
  book:      [[<path key="a" d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>, <path key="b" d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>]],
  briefcase: [[<rect key="a" x="2" y="7" width="20" height="14" rx="2"/>, <path key="b" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>]],
  person:    [[<circle key="a" cx="12" cy="8" r="4"/>, <path key="b" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>]],
  bag:       [[<path key="a" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>, <line key="b" x1="3" y1="6" x2="21" y2="6"/>, <path key="c" d="M16 10a4 4 0 01-8 0"/>]],
  heart:     [[<path key="a" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>]],
  star:      [[<polygon key="a" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>]],
  home:      [[<path key="a" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>, <polyline key="b" points="9 22 9 12 15 12 15 22"/>]],
  plane:     [[<path key="a" d="M22 2L11 13"/>, <path key="b" d="M22 2L15 22 11 13 2 9l20-7z"/>]],
  leaf:      [[<path key="a" d="M2 22c0 0 5-3 10-8s8-12 8-12-7 3-12 8-6 12-6 12z"/>, <path key="b" d="M2 22l7-7"/>]],
  music:     [[<path key="a" d="M9 18V5l12-2v13"/>, <circle key="b" cx="6" cy="18" r="3"/>, <circle key="c" cx="18" cy="16" r="3"/>]],
  target:    [[<circle key="a" cx="12" cy="12" r="10"/>, <circle key="b" cx="12" cy="12" r="6"/>, <circle key="c" cx="12" cy="12" r="2"/>]],
  pencil:    [[<path key="a" d="M12 20h9"/>, <path key="b" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z"/>]],
  rocket:    [[<path key="a" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>, <path key="b" d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>]],
  tag:       [[<path key="a" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>, <line key="b" x1="7" y1="7" x2="7.01" y2="7"/>]],
  clock:     [[<circle key="a" cx="12" cy="12" r="10"/>, <polyline key="b" points="12 6 12 12 16 14"/>]],
  dumbbell:  [[<path key="a" d="M6.5 6.5h-3v11h3"/>, <path key="b" d="M17.5 6.5h3v11h-3"/>, <line key="c" x1="6.5" y1="12" x2="17.5" y2="12"/>, <path key="d" d="M6.5 9v6"/>, <path key="e" d="M17.5 9v6"/>]],
  coffee:    [[<path key="a" d="M17 8h1a4 4 0 010 8h-1"/>, <path key="b" d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4z"/>, <line key="c" x1="6" y1="2" x2="6" y2="4"/>, <line key="d" x1="10" y1="2" x2="10" y2="4"/>, <line key="e" x1="14" y1="2" x2="14" y2="4"/>]],
  camera:    [[<path key="a" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>, <circle key="b" cx="12" cy="13" r="4"/>]],
  flag:       [[<path key="a" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>, <line key="b" x1="4" y1="22" x2="4" y2="15"/>]],
  map:        [[<polygon key="a" points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>, <line key="b" x1="8" y1="2" x2="8" y2="18"/>, <line key="c" x1="16" y1="6" x2="16" y2="22"/>]],
  sun:        [[<circle key="a" cx="12" cy="12" r="4"/>, <path key="b" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>]],
  moon:       [[<path key="a" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>]],
  zap:        [[<polygon key="a" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>]],
  globe:      [[<circle key="a" cx="12" cy="12" r="10"/>, <line key="b" x1="2" y1="12" x2="22" y2="12"/>, <path key="c" d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>]],
  phone:      [[<path key="a" d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>]],
  mail:       [[<path key="a" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>, <polyline key="b" points="22,6 12,13 2,6"/>]],
  calendar:   [[<rect key="a" x="3" y="4" width="18" height="18" rx="2"/>, <line key="b" x1="16" y1="2" x2="16" y2="6"/>, <line key="c" x1="8" y1="2" x2="8" y2="6"/>, <line key="d" x1="3" y1="10" x2="21" y2="10"/>]],
  lock:       [[<rect key="a" x="3" y="11" width="18" height="11" rx="2"/>, <path key="b" d="M7 11V7a5 5 0 0110 0v4"/>]],
  key:        [[<circle key="a" cx="8" cy="15" r="4"/>, <path key="b" d="M12 11l8-8"/>, <path key="c" d="M20 8l-2 2"/>, <path key="d" d="M17 5l2 2"/>]],
  graduation: [[<path key="a" d="M22 10v6M2 10l10-5 10 5-10 5z"/>, <path key="b" d="M6 12v5c3 3 9 3 12 0v-5"/>]],
  fire:       [[<path key="a" d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>]],
  trophy:     [[<path key="a" d="M6 9H4a1 1 0 01-1-1V5a1 1 0 011-1h16a1 1 0 011 1v3a1 1 0 01-1 1h-2"/>, <path key="b" d="M12 17a7 7 0 007-7H5a7 7 0 007 7z"/>, <path key="c" d="M12 17v4"/>, <path key="d" d="M8 21h8"/>]],
  code:       [[<polyline key="a" points="16 18 22 12 16 6"/>, <polyline key="b" points="8 6 2 12 8 18"/>]],
  chart:      [[<line key="a" x1="18" y1="20" x2="18" y2="10"/>, <line key="b" x1="12" y1="20" x2="12" y2="4"/>, <line key="c" x1="6" y1="20" x2="6" y2="14"/>]],
  dollar:     [[<line key="a" x1="12" y1="1" x2="12" y2="23"/>, <path key="b" d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>]],
  headphones: [[<path key="a" d="M3 18v-6a9 9 0 0118 0v6"/>, <path key="b" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z"/>, <path key="c" d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>]],
  gift:       [[<polyline key="a" points="20 12 20 22 4 22 4 12"/>, <rect key="b" x="2" y="7" width="20" height="5"/>, <line key="c" x1="12" y1="22" x2="12" y2="7"/>, <path key="d" d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>, <path key="e" d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>]],
  compass:    [[<circle key="a" cx="12" cy="12" r="10"/>, <polygon key="b" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>]],
  flask:      [[<path key="a" d="M10 2v7.31L5.5 19A2 2 0 007.31 22h9.38a2 2 0 001.81-2.69L14 9.31V2"/>, <line key="b" x1="8.5" y1="2" x2="15.5" y2="2"/>]],
  cloud:      [[<path key="a" d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>]],
}

const ICON_LIST = Object.keys(ICON_PATHS)

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

function CategoryIcon({ name, iconId, size = 18, color = 'white' }) {
  const id = (iconId && ICON_PATHS[iconId]) ? iconId : (BUILT_IN_ICON_MAP[name] || 'tag')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[id]}
    </svg>
  )
}

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
    if (isEditing) onCancel()
    else onCreated()
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

    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={e => {
        if (e.target !== e.currentTarget || saving || deleting) return
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else onCancel()
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
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
            onClick={onCancel}
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

  return (
    <div
      className="fixed inset-0 z-60 flex items-end bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !deleting) onCancel() }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl p-6 shadow-2xl">
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
            onClick={onCancel}
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
