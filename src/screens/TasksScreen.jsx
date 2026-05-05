import { useState } from 'react'
import { CATEGORY_COLORS, formatDueDate, getDateGroup } from '../lib/utils'

const DATE_GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'Done']
const CATEGORIES = ['All', 'School', 'Work', 'Personal', 'Errands', 'Health']

export default function TasksScreen({ tasks, onTaskUpdated, onOpenTask, onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [collapsed, setCollapsed] = useState({})

  const filtered = tasks.filter(t =>
    activeCategory === 'All' || t.category === activeCategory
  )

  const grouped = {}
  for (const task of filtered) {
    const group = task.is_complete ? 'Done' : getDateGroup(task.due_date)
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(task)
  }

  function toggleCollapse(group) {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-xl">My Tasks</h1>
      </header>

      {/* Category filter */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === cat
                ? 'bg-accent-deep text-white'
                : 'border border-white/20 text-white/50 hover:text-white hover:border-white/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
        {filtered.length === 0 ? (
          <EmptyTasks category={activeCategory} onNavigate={onNavigate} />
        ) : (
          DATE_GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <section key={group}>
              <button
                onClick={() => toggleCollapse(group)}
                className="flex items-center gap-2 w-full mb-3"
              >
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  group === 'Overdue' ? 'text-red-400' :
                  group === 'Today' ? 'text-accent-light' :
                  group === 'Done' ? 'text-white/25' : 'text-white/40'
                }`}>
                  {group}
                </span>
                <span className="text-white/20 text-xs">{grouped[group].length}</span>
                <span className="ml-auto text-white/30 text-xs">{collapsed[group] ? '▶' : '▼'}</span>
              </button>

              {!collapsed[group] && (
                <div className="space-y-2">
                  {grouped[group].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
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

      {/* FAB */}
      <button
        onClick={() => onNavigate('home', { focusChat: true })}
        className="fixed bottom-20 right-5 w-14 h-14 bg-accent-deep hover:bg-accent-mid rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-colors z-10"
      >
        +
      </button>
    </div>
  )
}

function TaskCard({ task, onToggle, onOpen }) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Personal

  return (
    <div
      className="bg-card-bg rounded-xl flex items-center border border-white/10 hover:border-white/20 transition-colors overflow-hidden"
    >
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />

      <button
        onClick={onToggle}
        className="w-10 h-10 flex items-center justify-center flex-shrink-0 ml-1"
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.is_complete
            ? 'bg-accent-deep border-accent-deep'
            : 'border-white/30 hover:border-accent-light'
        }`}>
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="white">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
        </div>
      </button>

      <button onClick={onOpen} className="flex-1 py-3 pr-3 text-left min-w-0">
        <p className={`text-sm font-medium leading-tight truncate ${
          task.is_complete ? 'line-through text-white/25' : 'text-white'
        }`}>
          {task.task_name}
        </p>
        {task.due_date && (
          <p className={`text-xs mt-0.5 ${
            getDateGroup(task.due_date) === 'Overdue' && !task.is_complete
              ? 'text-red-400' : 'text-white/40'
          }`}>
            {formatDueDate(task.due_date)}
          </p>
        )}
      </button>

      <span
        className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded mr-3"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {task.category}
      </span>
    </div>
  )
}

function EmptyTasks({ category, onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-white/50 text-sm">
        No {category !== 'All' ? category.toLowerCase() + ' ' : ''}tasks yet
      </p>
      <button
        onClick={() => onNavigate('home', { focusChat: true })}
        className="mt-4 border border-white/20 text-white/60 text-sm px-4 py-2 rounded-xl hover:text-white hover:border-white/40 transition-colors"
      >
        Add a task
      </button>
    </div>
  )
}
