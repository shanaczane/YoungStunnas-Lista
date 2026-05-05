export default function ProfileAvatar({ displayName, onNavigate }) {
  const initials = displayName
    ? displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?'

  return (
    <div className="flex-shrink-0">
      <button
        id="profile-avatar-btn"
        onClick={() => onNavigate?.('profile')}
        aria-label="View profile"
        className="w-9 h-9 rounded-full bg-accent-deep text-white text-sm font-bold flex items-center justify-center select-none transition-transform active:scale-95 hover:brightness-110"
        style={{ boxShadow: '0 2px 10px rgba(26,79,214,0.35)' }}
      >
        {initials}
      </button>
    </div>
  )
}
