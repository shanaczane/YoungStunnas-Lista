export default function BottomNav({ active, onNavigate, onAddTask }) {
  const leftTabs = [
    { id: 'home',  label: 'Home',  icon: <HomeIcon /> },
    { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
  ]
  const rightTabs = [
    { id: 'spaces',        label: 'Spaces', icon: <SpacesIcon /> },
    { id: 'notifications', label: 'Alerts', icon: <BellIcon /> },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-divider flex items-end z-20 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: 'var(--color-nav-bg)', boxShadow: '0 -2px 12px var(--color-shadow-main)' }}
    >
      {leftTabs.map(tab => (
        <TabButton key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />
      ))}

      {/* Center FAB */}
      <div className="flex-1 flex justify-center pb-2">
        <button
          onClick={onAddTask}
          className="fab w-14 h-14 bg-accent-deep rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
          style={{ boxShadow: '0 4px 16px rgba(10,46,92,0.45)' }}
          aria-label="Add task"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {rightTabs.map(tab => (
        <TabButton key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />
      ))}
    </nav>
  )
}

function TabButton({ tab, active, onNavigate }) {
  const isActive = active === tab.id
  return (
    <button
      onClick={() => onNavigate(tab.id)}
      className={`flex-1 flex flex-col items-center pt-2.5 pb-3 gap-0.5 transition-colors ${
        isActive ? 'text-accent-deep' : 'text-slate-400'
      }`}
    >
      {tab.icon}
      <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-accent-deep' : 'text-slate-400'}`}>
        {tab.label}
      </span>
    </button>
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
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

function SpacesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1"/>
      <rect x="13" y="3" width="8" height="8" rx="1"/>
      <rect x="3" y="13" width="8" height="8" rx="1"/>
      <rect x="13" y="13" width="8" height="8" rx="1"/>
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
