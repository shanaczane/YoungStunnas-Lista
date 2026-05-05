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
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 flex items-end z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}
    >
      {leftTabs.map(tab => (
        <TabButton key={tab.id} tab={tab} active={active} onNavigate={onNavigate} />
      ))}

      {/* Center FAB */}
      <div className="flex-1 flex justify-center pb-2">
        <button
          onClick={onAddTask}
          className="fab w-14 h-14 bg-accent-deep rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
          style={{ boxShadow: '0 4px 16px rgba(26,79,214,0.45)' }}
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
      <rect x="3" y="5" width="6" height="6" rx="1"/>
      <rect x="3" y="13" width="6" height="6" rx="1"/>
      <line x1="13" y1="7" x2="21" y2="7"/>
      <line x1="13" y1="15" x2="21" y2="15"/>
      <line x1="13" y1="19" x2="21" y2="19"/>
    </svg>
  )
}

function SpacesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <circle cx="17" cy="10" r="3"/>
      <path d="M1 21v-1a7 7 0 0 1 12-4.9"/>
      <path d="M17 21v-1a4 4 0 0 0-4-4"/>
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
