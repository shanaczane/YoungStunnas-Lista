export default function BottomNav({ active, onNavigate }) {
  const tabs = [
    { id: 'home',          label: 'Home',   icon: <HomeIcon /> },
    { id: 'tasks',         label: 'Tasks',  icon: <TasksIcon /> },
    { id: 'spaces',        label: 'Spaces', icon: <SpacesIcon /> },
    { id: 'notifications', label: 'Alerts', icon: <BellIcon /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-white/10 flex z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex-1 flex flex-col items-center pt-3 pb-3.5 gap-1 transition-colors ${
            active === tab.id ? 'text-accent-light' : 'text-white/35 hover:text-white/60'
          }`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function SpacesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}
