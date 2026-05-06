import { useState } from 'react'
import mainLogo from '../../mascots/main-logo.png'
import LandingScreen from './LandingScreen'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'
import { Divider, GoogleButton } from './AuthComponents'

export default function AuthScreen({ defaultTab = 'login' }) {
  const [view, setView] = useState('landing')
  const [tab, setTab] = useState(defaultTab)

  if (view === 'landing') {
    return (
      <LandingScreen
        onGetStarted={() => { setTab('signup'); setView('auth') }}
        onLogin={() => { setTab('login'); setView('auth') }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-black/8 px-7 py-8">
        <div className="flex flex-col items-center text-center mb-7">
          <img src={mainLogo} alt="Lista" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {tab === 'login' ? 'Sign in' : 'Sign up'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {tab === 'login' ? 'Welcome back to Lista' : 'Create your Lista account'}
          </p>
        </div>

        {tab === 'login'
          ? <LoginForm />
          : <SignUpForm onSuccess={() => setTab('login')} />
        }

        <Divider />
        <GoogleButton />

        <p className="text-center text-sm text-slate-400 mt-5">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
            className="text-accent-deep font-semibold hover:underline"
          >
            {tab === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
