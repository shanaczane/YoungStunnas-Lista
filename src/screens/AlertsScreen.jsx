import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import { CATEGORY_COLORS, formatDueDate, getDateGroup } from '../lib/utils'

export default function AlertsScreen({ tasks, session, displayName, onOpenTask, onNavigate }) {
  const upcoming = tasks
    .filter(t => !t.is_complete && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const overdue = upcoming.filter(t => getDateGroup(t.due_date) === 'Overdue')
  const today   = upcoming.filter(t => getDateGroup(t.due_date) === 'Today')
  const later   = upcoming.filter(t => !['Overdue', 'Today'].includes(getDateGroup(t.due_date)))

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader>
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Reminders</h1>
          <p className="text-slate-400 text-xs mt-0.5">{upcoming.length} upcoming</p>
        </div>
        <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-6">
        {upcoming.length === 0 ? (
          <EmptyReminders />
        ) : (
          <>
            {overdue.length > 0 && (
              <ReminderSection title="Overdue" titleColor="text-red-500" tasks={overdue} onOpenTask={onOpenTask} />
            )}
            {today.length > 0 && (
              <ReminderSection title="Today" titleColor="text-accent-deep" tasks={today} onOpenTask={onOpenTask} />
            )}
            {later.length > 0 && (
              <ReminderSection title="Upcoming" titleColor="text-slate-400" tasks={later} onOpenTask={onOpenTask} />
            )}
          </>
        )}

        <section className="bg-white rounded-2xl p-4 card-elevated">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">How Reminders Work</p>
          <div className="space-y-3">
            <Tip icon="💬" text="Type a task with a date — Lista sets the reminder automatically." />
            <Tip icon="✏️" text="Tap any task to set a custom reminder time (15 min, 1 hour, 1 day before)." />
            <Tip icon="🔔" text="Install Lista as a PWA to receive push notifications on your device." />
          </div>
        </section>
      </div>
    </div>
  )
}

function ReminderSection({ title, titleColor, tasks, onOpenTask }) {
  return (
    <section>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${titleColor}`}>{title}</p>
      <div className="space-y-2.5">
        {tasks.map(task => (
          <ReminderRow key={task.id} task={task} onOpenTask={onOpenTask} />
        ))}
      </div>
    </section>
  )
}

function ReminderRow({ task, onOpenTask }) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Personal
  const isOverdue = getDateGroup(task.due_date) === 'Overdue'

  return (
    <button
      onClick={() => onOpenTask(task.id)}
      className="w-full bg-white rounded-2xl flex items-center card-elevated transition-all active:scale-[0.99] overflow-hidden text-left"
    >
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: isOverdue ? '#ef4444' : colors.border }} />
      <div className="flex-1 py-3.5 px-3 min-w-0">
        <p className="text-slate-800 text-sm font-semibold leading-tight truncate">{task.task_name}</p>
        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
          {formatDueDate(task.due_date)}
        </p>
      </div>
      <div className="pr-3 flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {task.category}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-300">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </button>
  )
}

function Tip({ icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base flex-shrink-0">{icon}</span>
      <p className="text-slate-400 text-xs leading-relaxed">{text}</p>
    </div>
  )
}

function EmptyReminders() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <img src="/mascots/reminders.png" alt="Ollie" className="w-32 h-32 object-contain mb-2" />
      <p className="text-slate-400 text-sm">No upcoming reminders</p>
      <p className="text-slate-300 text-xs mt-1">Tasks with due dates will appear here</p>
    </div>
  )
}
