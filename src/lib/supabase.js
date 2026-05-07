import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — fill in .env')
}

// Give each tab its own BroadcastChannel so sign-out in one tab
// does not propagate to other tabs. On reload we reuse the same key
// so the session survives; on fresh load or tab duplication we generate
// a new key so the tab starts independent.
const navType = performance.getEntriesByType?.('navigation')[0]?.type ?? 'navigate'
const isReload = navType === 'reload' || navType === 'back_forward'
let tabId = isReload ? sessionStorage.getItem('lista-tab-id') : null
if (!tabId) {
  tabId = Math.random().toString(36).slice(2, 10)
  sessionStorage.setItem('lista-tab-id', tabId)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    storageKey: `sb-lista-auth-${tabId}`,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
