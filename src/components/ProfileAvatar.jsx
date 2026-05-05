import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfileAvatar({ displayName, onNavigate }) {
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadCurrentAvatar() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setAvatarUrl(data?.user?.user_metadata?.avatar_url || null)
      setImgFailed(false)
    }

    loadCurrentAvatar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAvatarUrl(session?.user?.user_metadata?.avatar_url || null)
      setImgFailed(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const initials = displayName
    ? displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?'

  return (
    <div className="shrink-0">
      <button
        id="profile-avatar-btn"
        onClick={() => onNavigate?.('profile')}
        aria-label="View profile"
        className="w-9 h-9 rounded-full bg-accent-deep text-white text-sm font-bold flex items-center justify-center select-none transition-transform active:scale-95 hover:brightness-110 overflow-hidden"
        style={{ boxShadow: '0 2px 10px rgba(26,79,214,0.35)' }}
      >
        {avatarUrl && !imgFailed ? (
          <img
            src={avatarUrl}
            alt={displayName || 'Profile avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          initials
        )}
      </button>
    </div>
  )
}
