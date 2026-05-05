export const CATEGORY_COLORS = {
  School:   { bg: '#DBEAFE', border: '#1A56A0', text: '#1A56A0' },
  Work:     { bg: '#EFF6FF', border: '#2563EB', text: '#2563EB' },
  Personal: { bg: '#F0F9FF', border: '#3B82F6', text: '#3B82F6' },
  Errands:  { bg: '#F8FAFC', border: '#64748B', text: '#64748B' },
  Health:   { bg: '#ECFDF5', border: '#059669', text: '#059669' },
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatDueDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.toDateString())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const taskDay = new Date(d.toDateString())

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (taskDay.getTime() === today.getTime()) return `Today ${timeStr}`
  if (taskDay.getTime() === tomorrow.getTime()) return `Tomorrow ${timeStr}`

  const diff = Math.round((taskDay - today) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function getDateGroup(iso) {
  if (!iso) return 'Later'
  const d = new Date(iso)
  const today = new Date(new Date().toDateString())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const taskDay = new Date(d.toDateString())

  if (taskDay < today) return 'Overdue'
  if (taskDay.getTime() === today.getTime()) return 'Today'
  if (taskDay.getTime() === tomorrow.getTime()) return 'Tomorrow'

  const diff = Math.round((taskDay - today) / 86400000)
  if (diff <= 7) return 'This Week'
  return 'Later'
}
