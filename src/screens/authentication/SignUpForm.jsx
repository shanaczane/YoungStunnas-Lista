import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Field, SubmitButton, Eye, EyeOff } from './AuthComponents'

export default function SignUpForm({ onSuccess }) {
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
        <p className="text-[#0A2240] font-semibold">Account created!</p>
        <p className="text-[#7A8AA1] text-xs">You can now log in with your credentials.</p>
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
            <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[#7A8AA1] hover:text-[#3A4F6E]">
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
