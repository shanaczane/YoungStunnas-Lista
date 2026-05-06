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
            onNavigate={navigateTo}
            onOpenTask={openTask}
            onCategoriesChanged={() => loadCategories(session.user.id)}
            focusChat={focusChat}
            onFocusChatConsumed={() => setFocusChat(false)}
            pendingImage={pendingImage}
            onPendingImageConsumed={() => setPendingImage(null)}
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
          <SpacesScreen session={session} displayName={displayName} onNavigate={navigateTo} />
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
            onBack={() => setScreen('home')}
          />
        )}
      </div>

      <BottomNav
        active={screen}
        onNavigate={tab => navigateTo(tab)}
        onAddTask={() => navigateTo('home', { focusChat: true })}
        onImageCapture={handleImageCapture}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
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
