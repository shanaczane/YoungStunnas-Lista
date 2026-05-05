import { supabase } from './supabase'

export const BUILT_IN_CATEGORIES = [
  { name: 'School',   color: '#1A56A0', emoji: '📚' },
  { name: 'Work',     color: '#2563EB', emoji: '💼' },
  { name: 'Personal', color: '#3B82F6', emoji: '🙂' },
  { name: 'Errands',  color: '#64748B', emoji: '🛒' },
  { name: 'Health',   color: '#059669', emoji: '💪' },
]

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Returns { bg, border, text } for any category name */
export function getCategoryColor(name, customCategories = []) {
  const custom = customCategories.find(c => c.name === name)
  if (custom) {
    return {
      bg:     hexToRgba(custom.color, 0.12),
      border: custom.color,
      text:   custom.color,
    }
  }
  const BUILT_IN_COLORS = {
    School:   { bg: '#DBEAFE', border: '#1A56A0', text: '#1A56A0' },
    Work:     { bg: '#EFF6FF', border: '#2563EB', text: '#2563EB' },
    Personal: { bg: '#F0F9FF', border: '#3B82F6', text: '#3B82F6' },
    Errands:  { bg: '#F8FAFC', border: '#64748B', text: '#64748B' },
    Health:   { bg: '#ECFDF5', border: '#059669', text: '#059669' },
  }
  return BUILT_IN_COLORS[name] || { bg: '#F1F5F9', border: '#94A3B8', text: '#94A3B8' }
}

/** Returns emoji for a category */
export function getCategoryEmoji(name, customCategories = []) {
  const custom = customCategories.find(c => c.name === name)
  if (custom) return custom.emoji || '📁'
  const built = BUILT_IN_CATEGORIES.find(b => b.name === name)
  return built?.emoji || '📁'
}

export async function fetchCategories(userId) {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function createCategory(userId, { name, color, emoji }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: name.trim(), color, emoji })
    .select()
    .single()
  return { data, error }
}

export async function deleteCategory(id) {
  return supabase.from('categories').delete().eq('id', id)
}
