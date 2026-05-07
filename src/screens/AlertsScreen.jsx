import { useState } from 'react'
import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import { formatDueDate, getDateGroup } from '../lib/utils'
import { getCategoryColor } from '../lib/categories'
import mascot from '../mascots/home-mascot.png'

const STORAGE_KEY = 'lista_alerts_read'

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}

function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export default function AlertsScreen({ tasks, session, displayName, onOpenTask, onNavigate }) {
  const [readIds, setReadIds] = useState(getReadIds)

  const upcoming = tasks
    .filter(t => !t.is_complete && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const overdue = upcoming.filter(t => getDateGroup(t.due_date) === 'Overdue')
  const today   = upcoming.filter(t => getDateGroup(t.due_date) === 'Today')
  const later   = upcoming.filter(t => !['Overdue', 'Today'].includes(getDateGroup(t.due_date)))

  const unreadCount = upcoming.filter(t => !readIds.has(t.id)).length

  function markAllRead() {
    const next = new Set([...readIds, ...upcoming.map(t => t.id)])
    setReadIds(next)
    saveReadIds(next)
  }

  function handleOpen(taskId) {
    const next = new Set([...readIds, taskId])
    setReadIds(next)
    saveReadIds(next)
    onOpenTask(taskId)
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader className="px-5 pt-6 pb-4 bg-card-bg border-b border-divider">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-slate-900 font-bold text-2xl">Alerts</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent-deep font-semibold"
              >
                Mark all as read
              </button>
            )}
            <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
          </div>
        </div>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto pb-6">
        {upcoming.length === 0 ? (
          <EmptyAlerts />
        ) : (
          <>
            {overdue.length > 0 && (
              <AlertSection title="Overdue" dotColor="#ef4444" tasks={overdue} readIds={readIds} onOpen={handleOpen} />
            )}
            {today.length > 0 && (
              <AlertSection title="Today" dotColor="#0A2E5C" tasks={today} readIds={readIds} onOpen={handleOpen} />
            )}
            {later.length > 0 && (
              <AlertSection title="Upcoming" dotColor="#94a3b8" tasks={later} readIds={readIds} onOpen={handleOpen} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AlertSection({ title, dotColor, tasks, readIds, onOpen }) {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-5 pb-1">
        {title}
      </p>
      <div className="bg-card-bg border-y border-divider">
        {tasks.map((task, i) => (
          <AlertRow
            key={task.id}
            task={task}
            dotColor={dotColor}
            isRead={readIds.has(task.id)}
            isLast={i === tasks.length - 1}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}

function AlertRow({ task, dotColor, isRead, isLast, onOpen }) {
  const colors = getCategoryColor(task.category)
  const isOverdue = getDateGroup(task.due_date) === 'Overdue'

  return (
    <button
      onClick={() => onOpen(task.id)}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors active:bg-app-bg ${
        !isLast ? 'border-b border-divider' : ''
      } ${isRead ? 'bg-card-bg' : 'bg-white'}`}
    >
      <div className="w-2 shrink-0 flex justify-center">
        {!isRead && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug truncate ${isRead ? 'text-slate-400 font-normal' : 'text-slate-800 font-semibold'}`}>
          {task.task_name}
        </p>
        <span
          className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {task.category}
        </span>
      </div>

      <p className={`shrink-0 text-xs font-medium text-right ${isOverdue ? 'text-red-500' : isRead ? 'text-slate-300' : 'text-slate-400'}`}>
        {formatDueDate(task.due_date)}
      </p>
    </button>
  )
}

function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-5 pt-16">
      <img src={mascot} alt="Ollie" className="w-32 h-32 object-contain mb-2" />
      <p className="text-slate-400 text-sm">No upcoming reminders</p>
      <p className="text-slate-300 text-xs mt-1">Tasks with due dates will appear here</p>
    </div>
  )
}
