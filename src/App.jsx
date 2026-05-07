import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './screens/authentication/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import TasksScreen from './screens/TasksScreen'
import SpacesScreen from './screens/SpacesScreen'
import AlertsScreen from './screens/AlertsScreen'
import ProfileScreen from './screens/ProfileScreen'
import TaskDetailModal from './screens/TaskDetailModal'
import BottomNav from './components/BottomNav'
import { fetchCategories } from './lib/categories'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [screen, setScreen] = useState('home')
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [focusChat, setFocusChat] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [pendingJoinId, setPendingJoinId] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('join')
    if (p) window.history.replaceState({}, '', window.location.pathname)
    return p || null
  })
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('lista-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    const applyTheme = (t) => {
      if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('lista-theme', theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchTasks = useCallback(async (userId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .is('space_id', null)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }, [])

  const loadCategories = useCallback(async (userId) => {
    const data = await fetchCategories(userId)
    setCategories(data)
  }, [])

  useEffect(() => {
    if (!session?.user) return
    const dn = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
    // Auto-register user in profiles so others can find them by User ID
    const userCode = session.user.id.replace(/-/g, '').slice(0, 8).toUpperCase()
    const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
    supabase.from('profiles').upsert({ id: session.user.id, display_name: dn, user_code: userCode, avatar_url: avatarUrl }, { onConflict: 'id' })
    // Handle invite link join
    if (pendingJoinId) {
      supabase.from('space_members')
        .select('user_id').eq('space_id', pendingJoinId).eq('user_id', session.user.id).maybeSingle()
        .then(({ data: existing }) => {
          if (!existing) {
            const av = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
            return supabase.from('space_members').insert({ space_id: pendingJoinId, user_id: session.user.id, display_name: dn, avatar_url: av })
          }
        })
        .then(() => { setPendingJoinId(null); setScreen('spaces') })
    }
    fetchTasks(session.user.id)
    loadCategories(session.user.id)

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${session.user.id}`,
      }, () => fetchTasks(session.user.id))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session, fetchTasks, loadCategories])

  useEffect(() => {
    if (!session?.user) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const SHOWN_KEY = 'lista_notifs_shown'
    function checkReminders() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const now = Date.now()
      let shown
      try { shown = new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]')) }
      catch { shown = new Set() }
      let changed = false
      tasks.forEach(task => {
        if (task.is_complete || !task.due_date || task.reminder_minutes == null) return
        const reminderTime = new Date(task.due_date).getTime() - task.reminder_minutes * 60 * 1000
        const key = `${task.id}|${task.due_date}|${task.reminder_minutes}`
        if (reminderTime <= now && reminderTime >= now - 2 * 60 * 1000 && !shown.has(key)) {
          shown.add(key); changed = true
          const m = task.reminder_minutes
          const body = m === 0 ? 'Due now!'
            : m < 60 ? `Due in ${m} min`
            : m < 1440 ? `Due in ${m / 60} hr`
            : `Due in ${m / 1440} day${m / 1440 > 1 ? 's' : ''}`
          const n = new Notification(task.task_name, { body, icon: '/favicon.ico', tag: key })
          n.onclick = () => { window.focus(); openTask(task.id); setScreen('notifications') }
        }
      })
      if (changed) localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]))
    }
    checkReminders()
    const interval = setInterval(checkReminders, 60 * 1000)
    return () => clearInterval(interval)
  }, [tasks, session])

  function handleTaskCreated(task) {
    setTasks(prev => [task, ...prev])
  }

  async function handleTaskUpdated(id, updates) {
    const { data } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) setTasks(prev => prev.map(t => t.id === id ? data : t))
  }

  async function handleTaskDeleted(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTaskId(null)
  }

  async function handleBulkDelete(ids) {
    await supabase.from('tasks').delete().in('id', ids)
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
  }

  function openTask(id) {
    setSelectedTaskId(id)
  }

  function closeTask() {
    setSelectedTaskId(null)
  }

  function navigateTo(tab, opts = {}) {
    setScreen(tab)
    if (opts.focusChat) setFocusChat(true)
  }

  function handleImageCapture(file) {
    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target.result.split(',')[1]
      setPendingImage(base64)
      setScreen('home')
    }
    reader.readAsDataURL(file)
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-deep border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <AuthScreen />

  const displayName =
    session.user.user_metadata?.display_name ||
    session.user.email?.split('@')[0] ||
    'there'

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null

  const alertUnreadCount = (() => {
    try {
      const readIds = new Set(JSON.parse(localStorage.getItem('lista_alerts_read') || '[]'))
      return tasks.filter(t => !t.is_complete && t.due_date && t.reminder_minutes != null && !readIds.has(t.id)).length
    } catch { return 0 }
  })()

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="pb-16">
        {screen === 'home' && (
          <HomeScreen
            session={session}
            displayName={displayName}
            tasks={tasks}
            categories={categories}
            onTaskCreated={handleTaskCreated}
            onTaskUpdated={handleTaskUpdated}
            onNavigate={navigateTo}
            onOpenTask={openTask}
            onCategoriesChanged={() => loadCategories(session.user.id)}
            focusChat={focusChat}
            onFocusChatConsumed={() => setFocusChat(false)}
            pendingImage={pendingImage}
            onPendingImageConsumed={() => setPendingImage(null)}
            onBulkDelete={handleBulkDelete}
          />
        )}
        {screen === 'tasks' && (
          <TasksScreen
            tasks={tasks}
            onTaskUpdated={handleTaskUpdated}
            onOpenTask={openTask}
            onNavigate={navigateTo}
            session={session}
            displayName={displayName}
            categories={categories}
            onCategoriesChanged={() => loadCategories(session.user.id)}
            onTasksChanged={() => fetchTasks(session.user.id)}
            onTaskCreated={handleTaskCreated}
          />
        )}
        {screen === 'spaces' && (
          <SpacesScreen session={session} displayName={displayName} onNavigate={navigateTo} openSpaceId={pendingJoinId} />
        )}
        {screen === 'notifications' && (
          <AlertsScreen
            tasks={tasks}
            session={session}
            displayName={displayName}
            onOpenTask={openTask}
            onNavigate={navigateTo}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            session={session}
            displayName={displayName}
            tasks={tasks}
            theme={theme}
            onSelectTheme={setTheme}
            onBack={() => setScreen('home')}
          />
        )}
      </div>

      <BottomNav
        active={screen}
        onNavigate={tab => navigateTo(tab)}
        onAddTask={() => navigateTo('home', { focusChat: true })}
        onImageCapture={handleImageCapture}
        alertCount={alertUnreadCount}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          tasks={tasks}
          categories={categories}
          session={session}
          onClose={closeTask}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
          onCategoriesChanged={() => loadCategories(session.user.id)}
        />
      )}
    </div>
  )
}
