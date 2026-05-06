import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import mainLogo from '../mascots/main-logo.png'

export default function AuthScreen({ defaultTab = 'login' }) {
  const [view, setView] = useState('landing')
  const [tab, setTab] = useState(defaultTab)

  if (view === 'landing') {
    return <LandingScreen
      onGetStarted={() => { setTab('signup'); setView('auth') }}
      onLogin={() => { setTab('login'); setView('auth') }}
    />
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

function LandingScreen({ onGetStarted, onLogin }) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#0E1B3D'
    return () => { document.body.style.backgroundColor = prev }
  }, [])

  return (
    <div className="min-h-screen bg-[#0E1B3D] flex flex-col px-6 py-14">
      <div className="flex flex-col items-center text-center gap-2">
        <img src={mainLogo} alt="Lista" className="w-20 h-20 object-contain mb-1" />
        <h1 className="text-4xl font-bold text-white tracking-tight">Lista</h1>
        <p className="text-[#7B93C8] text-xs tracking-[0.2em] uppercase font-mono">Just type. We handle the rest.</p>
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto gap-8 py-10">
        <div className="bg-[#162850] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#7B93C8] uppercase tracking-wider font-mono">You</span>
            <span className="text-white text-sm">submit thesis draft by friday</span>
          </div>
          <div className="flex justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="#7B93C8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-slate-800 text-sm font-medium">Submit thesis draft</span>
            <div className="flex items-center gap-1.5">
              <span className="bg-accent-deep text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">SCH</span>
              <span className="text-slate-400 text-xs font-mono">FRI · 11:59 PM</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {[['01', 'Type naturally'], ['02', 'AI organizes'], ['03', 'Never miss a deadline']].map(([num, label]) => (
            <div key={num} className="flex items-center gap-3">
              <span className="text-[#7B93C8] text-xs font-mono w-6 shrink-0">{num}</span>
              <span className="text-white text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
        <button
          onClick={onGetStarted}
          className="w-full bg-white text-[#0E1B3D] py-4 rounded-2xl font-semibold text-sm"
        >
          Get started
        </button>
        <button
          onClick={onLogin}
          className="w-full text-[#7B93C8] py-2 text-sm"
        >
          I already have an account
        </button>
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" required type="email" value={email} onChange={setEmail} placeholder="Enter your email" />
      <Field
        label="Password" required
        type={showPassword ? 'text' : 'password'}
        value={password} onChange={setPassword}
        placeholder="Enter your password"
        suffix={
          <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600">
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        }
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-accent-deep"
          />
          <span className="text-xs text-slate-500">Remember me</span>
        </label>
        <button type="button" className="text-xs text-accent-deep hover:underline">
          Forgot password?
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
    </form>
  )
}

function SignUpForm({ onSuccess }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!displayName.trim()) errs.displayName = 'Required'
    if (!email) errs.email = 'Required'
    if (password.length < 6) errs.password = 'Min 6 characters'
    if (password !== confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setErrors({})
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    })
    setLoading(false)
    if (error) { setErrors({ general: error.message }); return }
    setCreated(true)
  }

  if (created) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-accent-pale flex items-center justify-center text-accent-deep text-2xl font-bold">✓</div>
        <p className="text-slate-800 font-semibold">Account created!</p>
        <p className="text-slate-400 text-xs">You can now log in with your credentials.</p>
        <button
          onClick={onSuccess}
          className="w-full bg-accent-deep hover:bg-accent-mid text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2"
        >
          Go to Sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Display name" required type="text" placeholder="Your name"
        value={displayName} onChange={v => { setDisplayName(v); setErrors(e => ({ ...e, displayName: '' })) }}
        error={errors.displayName} />
      <Field label="Email" required type="email" placeholder="you@example.com"
        value={email} onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: '' })) }}
        error={errors.email} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password" required placeholder="••••••••"
          type={showPassword ? 'text' : 'password'}
          value={password} onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })) }}
          error={errors.password}
          suffix={
            <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          }
        />
        <Field label="Confirm password" required placeholder="••••••••"
          type={showConfirm ? 'text' : 'password'}
          value={confirm} onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })) }}
          error={errors.confirm}
          suffix={
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-slate-400 hover:text-slate-600">
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          }
        />
      </div>
      {errors.general && <p className="text-red-500 text-xs">{errors.general}</p>}
      <SubmitButton loading={loading} label="Sign up" loadingLabel="Creating account…" />
    </form>
  )
}

function Field({ label, required, type = 'text', value, onChange, error, placeholder, suffix }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className={`flex items-center bg-slate-50 rounded-xl border transition-colors px-3
        ${error ? 'border-red-400' : 'border-black/10 focus-within:border-accent-deep'}`}>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-slate-800 text-sm py-2.5 outline-none placeholder:text-slate-300 min-w-0"
        />
        {suffix && <span className="ml-2 flex-shrink-0">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-accent-deep hover:bg-accent-mid text-white py-3 rounded-xl
        font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-black/8" />
      <span className="text-slate-300 text-xs">or</span>
      <div className="flex-1 h-px bg-black/8" />
    </div>
  )
}

function GoogleButton() {
  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <button
      onClick={handleGoogle}
      className="w-full border border-black/10 hover:border-slate-300 text-slate-700 py-3
        rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-colors hover:bg-slate-50"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  )
}

function Eye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
