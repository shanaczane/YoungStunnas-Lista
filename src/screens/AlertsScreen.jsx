import ProfileAvatar from '../components/ProfileAvatar'
import ScreenHeader from '../components/ScreenHeader'
import { formatDueDate, getDateGroup } from '../lib/utils'
import { getCategoryColor } from '../lib/categories'
import { getPendingFriendRequests, getPendingTaskShares, respondToFriendRequest, respondToTaskShare } from '../lib/social'
import mascot from '../mascots/home-mascot.png'

export default function AlertsScreen({ tasks, session, displayName, onOpenTask, onNavigate, onSocialChanged, onAcceptSharedTask }) {
  const email = session?.user?.email || ''
  const friendRequests = getPendingFriendRequests(email)
  const taskShares = getPendingTaskShares(email)
  const upcoming = tasks
    .filter(t => !t.is_complete && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const overdue = upcoming.filter(t => getDateGroup(t.due_date) === 'Overdue')
  const today   = upcoming.filter(t => getDateGroup(t.due_date) === 'Today')
  const later   = upcoming.filter(t => !['Overdue', 'Today'].includes(getDateGroup(t.due_date)))
  const actionCount = friendRequests.length + taskShares.length

  async function handleFriendResponse(requestId, accept) {
    respondToFriendRequest(requestId, accept)
    onSocialChanged?.()
  }

  async function handleShareResponse(share, accept) {
    if (accept) {
      const result = onAcceptSharedTask ? await onAcceptSharedTask(share) : { error: true }
      const { error } = result
      if (error) return
    }
    respondToTaskShare(share.id, accept)
    onSocialChanged?.()
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader className="flex items-center justify-between px-5 pt-6 pb-4 bg-card-bg border-b border-divider">
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Reminders</h1>
          <p className="text-slate-400 text-xs mt-0.5">{upcoming.length} upcoming{actionCount ? ` - ${actionCount} request${actionCount !== 1 ? 's' : ''}` : ''}</p>
        </div>
        <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-6">
        {actionCount > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-accent-deep">Requests</p>
            <div className="space-y-2.5">
              {friendRequests.map(request => (
                <RequestCard
                  key={request.id}
                  title={`${request.fromName || request.fromEmail} added you`}
                  detail={request.fromEmail}
                  acceptLabel="Add friend"
                  declineLabel="Remove"
                  onAccept={() => handleFriendResponse(request.id, true)}
                  onDecline={() => handleFriendResponse(request.id, false)}
                />
              ))}
              {taskShares.map(share => (
                <RequestCard
                  key={share.id}
                  title={`${share.fromName || share.fromEmail} shared a list`}
                  detail={share.task.task_name}
                  acceptLabel="Add to tasks"
                  declineLabel="Dismiss"
                  onAccept={() => handleShareResponse(share, true)}
                  onDecline={() => handleShareResponse(share, false)}
                />
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && actionCount === 0 ? (
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

      </div>
    </div>
  )
}

function RequestCard({ title, detail, acceptLabel, declineLabel, onAccept, onDecline }) {
  return (
    <div className="w-full bg-card-bg rounded-2xl card-elevated overflow-hidden">
      <div className="px-4 py-3.5">
        <p className="text-slate-800 text-sm font-semibold leading-tight">{title}</p>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{detail}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-accent-deep text-white text-xs font-bold py-2.5"
          >
            {acceptLabel}
          </button>
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold py-2.5"
          >
            {declineLabel}
          </button>
        </div>
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
  const colors = getCategoryColor(task.category)
  const isOverdue = getDateGroup(task.due_date) === 'Overdue'

  return (
    <button
      onClick={() => onOpenTask(task.id)}
      className="w-full bg-card-bg rounded-2xl flex items-center card-elevated transition-all active:scale-[0.99] overflow-hidden text-left"
    >
      <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: isOverdue ? '#ef4444' : colors.border }} />
      <div className="flex-1 py-3.5 px-3 min-w-0">
        <p className="text-slate-800 text-sm font-semibold leading-tight truncate">{task.task_name}</p>
        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
          {formatDueDate(task.due_date)}
        </p>
      </div>
      <div className="pr-3 flex items-center gap-2 shrink-0">
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


function EmptyReminders() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <img src={mascot} alt="Ollie" className="w-32 h-32 object-contain mb-2" />
      <p className="text-slate-400 text-sm">No upcoming reminders</p>
      <p className="text-slate-300 text-xs mt-1">Tasks with due dates will appear here</p>
    </div>
  )
}
