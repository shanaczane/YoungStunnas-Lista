import { supabase } from '../lib/supabase'
import { CATEGORY_COLORS, formatDueDate, getDateGroup } from '../lib/utils'

export default function AlertsScreen({ tasks, session, onOpenTask }) {
  const now = new Date()

  const upcoming = tasks
    .filter(t => !t.is_complete && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const overdue = upcoming.filter(t => getDateGroup(t.due_date) === 'Overdue')
  const today = upcoming.filter(t => getDateGroup(t.due_date) === 'Today')
  const later = upcoming.filter(t => !['Overdue', 'Today'].includes(getDateGroup(t.due_date)))

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-xl">Reminders</h1>
        <button
          onClick={handleSignOut}
          className="text-white/40 hover:text-white text-xs border border-white/15 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
        {upcoming.length === 0 ? (
          <EmptyReminders />
        ) : (
          <>
            {overdue.length > 0 && (
              <ReminderSection
                title="Overdue"
                titleColor="text-red-400"
                tasks={overdue}
                onOpenTask={onOpenTask}
              />
            )}
            {today.length > 0 && (
              <ReminderSection
                title="Today"
                titleColor="text-accent-light"
                tasks={today}
                onOpenTask={onOpenTask}
              />
            )}
            {later.length > 0 && (
              <ReminderSection
                title="Upcoming"
                titleColor="text-white/40"
                tasks={later}
                onOpenTask={onOpenTask}
              />
            )}
          </>
        )}

        {/* Tips section */}
        <section className="bg-card-bg rounded-2xl p-4 border border-white/10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">How Reminders Work</p>
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
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${titleColor}`}>{title}</p>
      <div className="space-y-2">
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
      className="w-full bg-card-bg rounded-xl flex items-center border border-white/10 hover:border-white/20 transition-colors overflow-hidden text-left"
    >
      <div className="w-1 self-stretch flex-shrink-0" style={{ backgroundColor: isOverdue ? '#f87171' : colors.border }} />
      <div className="flex-1 py-3 px-3 min-w-0">
        <p className="text-white text-sm font-medium leading-tight truncate">{task.task_name}</p>
        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-white/40'}`}>
          {formatDueDate(task.due_date)}
        </p>
      </div>
      <div className="pr-3 flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {task.category}
        </span>
        <span className="text-white/20 text-xs">→</span>
      </div>
    </button>
  )
}

function Tip({ icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base flex-shrink-0">{icon}</span>
      <p className="text-white/40 text-xs leading-relaxed">{text}</p>
    </div>
  )
}

function EmptyReminders() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white/20">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
      </div>
      <p className="text-white/50 text-sm">No upcoming reminders</p>
      <p className="text-white/25 text-xs mt-1">Tasks with due dates will appear here</p>
    </div>
  )
}
