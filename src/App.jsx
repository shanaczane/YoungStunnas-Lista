import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './screens/AuthScreen'
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

  return (
    <div className="min-h-screen bg-app-bg pb-16">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-6">
        <p className="text-2xl font-semibold text-white">Good morning, {displayName}!</p>
        <p className="text-white/40 text-sm mt-2">Home screen coming soon.</p>
      </div>
      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
