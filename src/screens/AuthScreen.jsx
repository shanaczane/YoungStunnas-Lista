import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen({ defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab)

  function handleSignUpSuccess() {
    setTab('login')
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">Lista</h1>
        <p className="text-accent-pale text-sm mt-2">Just type. We handle the rest.</p>
      </div>

      <div className="w-full max-w-sm bg-card-bg rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex border-b border-white/10">
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'text-white border-b-2 border-accent-deep -mb-px'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'login' ? <LoginForm /> : <SignUpForm onSuccess={handleSignUpSuccess} />}

          <Divider />

          <GoogleButton />

          {tab === 'login' && (
            <p className="text-center mt-4">
              <button className="text-accent-light text-xs hover:underline">
                Forgot password?
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field label="Password" type="password" value={password} onChange={setPassword} />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <SubmitButton loading={loading} label="Log In" loadingLabel="Signing in…" />
    </form>
  )
}

function SignUpForm({ onSuccess }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!displayName.trim()) errs.displayName = 'Display name is required'
    if (!email) errs.email = 'Email is required'
    if (password.length < 6) errs.password = 'Password must be at least 6 characters'
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
        <div className="w-12 h-12 rounded-full bg-accent-deep/20 flex items-center justify-center text-2xl">
          ✓
        </div>
        <p className="text-white font-semibold">Account created!</p>
        <p className="text-white/50 text-xs">You can now log in with your credentials.</p>
        <button
          onClick={onSuccess}
          className="w-full bg-accent-deep hover:bg-accent-mid text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2"
        >
          Go to Log In
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Display Name"
        type="text"
        value={displayName}
        onChange={v => { setDisplayName(v); setErrors(e => ({ ...e, displayName: '' })) }}
        error={errors.displayName}
      />
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: '' })) }}
        error={errors.email}
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })) }}
        error={errors.password}
      />
      <Field
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })) }}
        error={errors.confirm}
      />
      {errors.general && <p className="text-red-400 text-xs">{errors.general}</p>}
      <SubmitButton loading={loading} label="Create Account" loadingLabel="Creating account…" />
    </form>
  )
}

function Field({ label, type, value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2.5 outline-none
          border transition-colors placeholder:text-white/25
          ${error ? 'border-red-400' : 'border-transparent focus:border-accent-mid'}`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
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
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/30 text-xs">or</span>
      <div className="flex-1 h-px bg-white/10" />
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
      className="w-full border border-white/20 hover:border-white/40 text-white py-3
        rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-colors"
    >
      <GoogleIcon />
      Continue with Google
    </button>
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
