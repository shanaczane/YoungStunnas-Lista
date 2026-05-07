import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ScreenHeader from '../components/ScreenHeader'

const THEMES = [
  { id: 'system', label: 'System Default' },
  { id: 'light',  label: 'Light' },
  { id: 'dark',   label: 'Dark' },
]

const CATEGORIES = ['School', 'Work', 'Personal', 'Errands', 'Health']

export default function ProfileScreen({ session, displayName, tasks, onBack, onSignOut, theme, onSelectTheme }) {
  const [editing, setEditing]           = useState(false)
  const [nameInput, setNameInput]       = useState(displayName)
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState('')
  const [avatarUrl, setAvatarUrl]       = useState(session?.user?.user_metadata?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef(null)

  const email    = session?.user?.email || ''
  const initials = displayName
    ? displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?'

  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : '—'

  // Stats
  const total     = tasks.length
  const completed = tasks.filter(t => t.is_complete).length
  const pending   = total - completed
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    count: tasks.filter(t => t.category === cat).length,
  })).filter(x => x.count > 0)

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === displayName) { setEditing(false); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    })
    setSaving(false)
    if (error) {
      setSaveMsg('Could not save — try again.')
    } else {
      setSaveMsg('Name updated!')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setEditing(false)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!session?.user?.id) {
      setSaveMsg('You must be signed in to upload a photo.')
      setTimeout(() => setSaveMsg(''), 3000)
      e.target.value = ''
      return
    }

    if (!file.type?.startsWith('image/')) {
      setSaveMsg('Please select a valid image file.')
      setTimeout(() => setSaveMsg(''), 3000)
      e.target.value = ''
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (file.size > maxBytes) {
      setSaveMsg('Image must be 5MB or smaller.')
      setTimeout(() => setSaveMsg(''), 3000)
      e.target.value = ''
      return
    }

    setUploadingAvatar(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${session.user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      const reason = uploadError.message || uploadError.error || 'Unknown storage error.'
      setSaveMsg(`Could not upload image: ${reason}`)
      setTimeout(() => setSaveMsg(''), 3000)
      setUploadingAvatar(false)
      e.target.value = ''
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
    await supabase.auth.updateUser({ data: { avatar_url: cacheBustedUrl } })
    setAvatarUrl(cacheBustedUrl)
    setSaveMsg('Photo updated!')
    setTimeout(() => setSaveMsg(''), 2000)
    setUploadingAvatar(false)
    e.target.value = ''
  }


async function handleSignOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    setSaveMsg('Failed to log out. Try again.')
    return
  }

  onSignOut?.() // notify parent (navigation, cleanup, etc.)
}

  if (showSettings) {
    return (
      <SettingsScreen
        theme={theme}
        onSelectTheme={onSelectTheme}
        onBack={() => setShowSettings(false)}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      {/* Header */}
      <ScreenHeader className="flex items-center gap-3 px-5 pt-6 pb-4 bg-card-bg border-b border-divider">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-slate-900 font-bold text-xl">Profile</h1>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Avatar + name card */}
        <div className="mx-5 mt-5 bg-card-bg rounded-2xl card-elevated p-5">
          <div className="flex items-center gap-4">
            {/* Avatar circle — tap to change photo */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative"
                style={{ boxShadow: '0 4px 16px rgba(26,79,214,0.35)' }}
                disabled={uploadingAvatar}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent-deep text-white text-2xl font-bold flex items-center justify-center">
                    {initials}
                  </div>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditing(false); setNameInput(displayName) } }}
                    className="flex-1 min-w-0 text-slate-900 font-semibold text-sm bg-slate-50 border border-black/10 focus:border-accent-deep rounded-xl px-3 py-2 outline-none"
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="shrink-0 px-3 py-2 rounded-xl bg-accent-deep text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setNameInput(displayName) }}
                    className="shrink-0 w-8 h-8 rounded-xl border border-black/10 text-slate-400 text-sm flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-bold text-lg leading-tight truncate">{displayName}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex-shrink-0 text-slate-400 hover:text-accent-deep transition-colors"
                    aria-label="Edit name"
                  >
                    <PencilIcon />
                  </button>
                </div>
              )}
              <p className="text-slate-400 text-xs mt-0.5 truncate">{email}</p>
              {saveMsg && <p className="text-accent-deep text-xs mt-1 font-medium">{saveMsg}</p>}
            </div>
          </div>

          {/* Member since */}
          <div className="mt-4 pt-4 border-t border-black/6 flex items-center gap-2 text-slate-400 text-xs">
            <CalendarIcon />
            <span>Member since {memberSince}</span>
          </div>
        </div>

        {/* Task stats */}
        <div className="mx-5 mt-4">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Task Overview</p>

          {/* Progress bar */}
          <div className="bg-card-bg rounded-2xl card-elevated p-4 mb-3">
            <div className="flex items-end justify-between mb-2">
              <p className="text-slate-800 text-sm font-semibold">Completion rate</p>
              <p className="text-accent-deep text-lg font-bold leading-none">{pct}%</p>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-deep transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3">
              <StatPill label="Total" value={total} color="text-slate-700" />
              <StatPill label="Done" value={completed} color="text-accent-deep" />
              <StatPill label="Pending" value={pending} color="text-amber-500" />
            </div>
          </div>

          {/* By category */}
          {byCategory.length > 0 && (
            <div className="bg-card-bg rounded-2xl card-elevated p-4">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">By Category</p>
              <div className="space-y-2.5">
                {byCategory.map(({ cat, count }) => (
                  <div key={cat} className="flex items-center gap-3">
                    <p className="text-slate-600 text-sm w-20 flex-shrink-0">{cat}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-mid transition-all duration-500"
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs w-6 text-right flex-shrink-0">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="mx-5 mt-4">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full bg-card-bg rounded-2xl card-elevated px-4 py-3.5 text-left text-slate-700 text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="text-slate-400">
                <SettingsIcon />
              </span>
              Settings
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Sign out */}
        <div className="mx-5 mt-4">
          <button
            onClick={handleSignOut}
            
            className="w-full bg-card-bg rounded-2xl card-elevated px-4 py-3.5 text-left text-red-500 text-sm font-semibold flex items-center gap-3 hover:bg-red-50 transition-colors"
          >
            <span className="text-red-400">
              <LogoutIcon />
            </span>
            Log out
          </button>
        </div>

      </div>
    </div>
  )
}

function SettingsScreen({ theme, onSelectTheme, onBack }) {
  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader className="flex items-center gap-3 px-5 pt-6 pb-4 bg-card-bg border-b border-divider">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-slate-900 font-bold text-xl">Settings</h1>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-5 mt-5">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Appearance</p>
          <div className="bg-card-bg rounded-2xl card-elevated overflow-hidden">
            {THEMES.map((t, i) => (
              <button
                key={t.id}
                id={`profile-theme-${t.id}`}
                onClick={() => onSelectTheme(t.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition-colors ${
                  i < THEMES.length - 1 ? 'border-b border-black/5' : ''
                } ${
                  theme === t.id
                    ? 'text-accent-deep font-semibold bg-accent-pale/40'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{t.label}</span>
                {theme === t.id && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-4">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Settings</p>
          <div className="bg-card-bg rounded-2xl card-elevated overflow-hidden">
            <SettingToggle
              label="Smart AI Parsing"
              description="Automatically detect dates and categories"
              storageKey="lista-ai-parsing"
              defaultVal={true}
            />
            <SettingToggle
              label="Sound Effects"
              description="Play subtle sounds on task completion"
              storageKey="lista-sounds"
              defaultVal={true}
              last
            />
          </div>
        </div>

        <div className="mx-5 mt-4">
          <div className="bg-card-bg rounded-2xl card-elevated overflow-hidden">
            <SettingToggle
              label="Show Completed Tasks"
              description="Keep finished tasks in your main list"
              storageKey="lista-show-completed"
              defaultVal={false}
              last
            />
          </div>
        </div>

        <p className="text-center text-slate-300 text-[11px] mt-6 mb-2">Lista · v0.1.0</p>
      </div>
    </div>
  )
}

function SettingToggle({ label, description, storageKey, defaultVal, last }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved !== null ? JSON.parse(saved) : defaultVal
  })

  function toggle() {
    const newVal = !enabled
    setEnabled(newVal)
    localStorage.setItem(storageKey, JSON.stringify(newVal))
  }

  return (
    <div className={`flex items-center justify-between px-4 py-4 ${!last ? 'border-b border-black/5' : ''}`}>
      <div className="flex-1 pr-4">
        <p className="text-slate-800 text-sm font-semibold">{label}</p>
        <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{description}</p>
      </div>
      <button
        onClick={toggle}
        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
          enabled ? 'bg-accent-deep' : 'bg-slate-200'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        />
      </button>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
      <p className="text-slate-400 text-[10px]">{label}</p>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1A2 2 0 014.2 17l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9L4.2 7A2 2 0 017 4.2l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 7l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.1a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>
    </svg>
  )
}
