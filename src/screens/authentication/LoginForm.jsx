import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Field, SubmitButton, Eye, EyeOff } from './AuthComponents'

export default function LoginForm() {
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
