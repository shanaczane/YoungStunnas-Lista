export const CATEGORY_COLORS = {
  School:   { bg: 'rgba(26,86,160,0.35)',  border: '#1A56A0', text: '#A8C9F0' },
  Work:     { bg: 'rgba(45,110,196,0.35)', border: '#2D6EC4', text: '#A8C9F0' },
  Personal: { bg: 'rgba(74,144,217,0.30)', border: '#4A90D9', text: '#A8C9F0' },
  Errands:  { bg: 'rgba(168,201,240,0.20)',border: '#A8C9F0', text: '#A8C9F0' },
  Health:   { bg: 'rgba(13,56,117,0.50)',  border: '#0D3875', text: '#4A90D9' },
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
