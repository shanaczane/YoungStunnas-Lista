import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import TasksScreen from './screens/TasksScreen'
import SpacesScreen from './screens/SpacesScreen'
import AlertsScreen from './screens/AlertsScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [screen, setScreen] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  const displayName =
    session.user.user_metadata?.display_name ||
    session.user.email?.split('@')[0] ||
    'there'

  const avatarLetter = displayName[0].toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-app-bg pb-16">
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-deep flex items-center justify-center text-white font-semibold text-sm">
            {avatarLetter}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{displayName}</p>
            <p className="text-white/40 text-xs">{session.user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-white/50 hover:text-white text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </header>

      {screen === 'home' && <HomeScreen displayName={displayName} />}
      {screen === 'tasks' && <TasksScreen />}
      {screen === 'spaces' && <SpacesScreen />}
      {screen === 'notifications' && <AlertsScreen />}
      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
