export default function BottomNav({ active, onNavigate }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
    { id: 'spaces', label: 'Spaces', icon: <SpacesIcon /> },
    { id: 'notifications', label: 'Alerts', icon: <BellIcon /> },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-white/10 flex safe-area-pb">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex-1 flex flex-col items-center pt-3 pb-4 gap-1 transition-colors ${
            active === tab.id ? 'text-accent-light' : 'text-white/40 hover:text-white/70'
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z" />
    </svg>
  )
}

function SpacesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  )
}
