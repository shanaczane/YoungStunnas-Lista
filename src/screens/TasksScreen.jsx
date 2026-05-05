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
      <header className="px-5 pt-6 pb-4 bg-white border-b border-black/6">
        <h1 className="text-slate-900 font-bold text-2xl">My Tasks</h1>
        <p className="text-slate-400 text-xs mt-0.5">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
      </header>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-black/6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeCategory === cat
                ? 'bg-accent-deep text-white'
                : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-6">
        {filtered.length === 0 ? (
          <EmptyTasks category={activeCategory} onNavigate={onNavigate} />
        ) : (
          DATE_GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <section key={group}>
              <button
                onClick={() => toggleCollapse(group)}
                className="flex items-center gap-2 w-full mb-3"
              >
                <span className={`text-[11px] font-bold uppercase tracking-widest ${
                  group === 'Overdue' ? 'text-red-500' :
                  group === 'Today'   ? 'text-accent-deep' :
                  group === 'Done'    ? 'text-slate-300' : 'text-slate-400'
                }`}>
                  {group}
                </span>
                <span className="text-[10px] font-semibold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-full">{grouped[group].length}</span>
                <span className="ml-auto text-slate-300 text-xs">{collapsed[group] ? '›' : '‹'}</span>
              </button>

              {!collapsed[group] && (
                <div className="space-y-2.5">
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
    </div>
  )
}

function TaskCard({ task, onToggle, onOpen }) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Personal

  return (
    <div className="bg-white rounded-2xl flex items-center card-elevated transition-all overflow-hidden active:scale-[0.99]">
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />

      <button
        onClick={onToggle}
        className="w-11 h-11 flex items-center justify-center flex-shrink-0"
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.is_complete
            ? 'bg-accent-deep border-accent-deep'
            : 'border-slate-300'
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
            getDateGroup(task.due_date) === 'Overdue' && !task.is_complete
              ? 'text-red-500' : 'text-slate-400'
          }`}>
            {formatDueDate(task.due_date)}
          </p>
        )}
      </button>

      <span
        className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full mr-3"
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
      <img src="/mascots/tasks.png" alt="Ollie" className="w-32 h-32 object-contain mb-2" />
      <p className="text-slate-400 text-sm">
        No {category !== 'All' ? category.toLowerCase() + ' ' : ''}tasks yet
      </p>
      <button
        onClick={() => onNavigate('home', { focusChat: true })}
        className="mt-4 border border-black/10 text-slate-500 text-sm px-4 py-2 rounded-xl hover:text-accent-deep hover:border-accent-deep/30 transition-colors"
      >
        Add a task
      </button>
    </div>
  )
}
