import { useEffect } from 'react'
import mainLogo from '../../mascots/main-logo.png'

export default function LandingScreen({ onGetStarted, onLogin }) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#0A2E5C'
    return () => { document.body.style.backgroundColor = prev }
  }, [])

  return (
    <div className="min-h-screen flex flex-col px-6 py-14" style={{ background: 'linear-gradient(to bottom, #0A2E5C, #08254A)' }}>
      <div className="flex flex-col items-center text-center gap-2">
        <img src={mainLogo} alt="Lista" className="w-20 h-20 object-contain mb-1" />
        <h1 className="text-4xl font-bold text-white tracking-tight">Lista</h1>
        <p className="text-accent-pale text-xs tracking-[0.2em] uppercase font-mono">Just type. We handle the rest.</p>
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto gap-8 py-10">
        <div className="bg-[#163768] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-accent-pale uppercase tracking-wider font-mono">You</span>
            <span className="text-white text-sm">submit thesis draft by friday</span>
          </div>
          <div className="flex justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="#A5C5E8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
              <span className="text-accent-pale text-xs font-mono w-6 shrink-0">{num}</span>
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
          className="w-full text-accent-pale py-2 text-sm"
        >
          I already have an account
        </button>
      </div>
    </div>
  )
}
