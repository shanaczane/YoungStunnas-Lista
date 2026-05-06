import { supabase } from './supabase'

export const BUILT_IN_CATEGORIES = [
  { name: 'School',   color: '#0A2E5C', emoji: '📚' },
  { name: 'Work',     color: '#1A56A0', emoji: '💼' },
  { name: 'Personal', color: '#3B7DD0', emoji: '🙂' },
  { name: 'Errands',  color: '#6BA3DD', emoji: '🛒' },
  { name: 'Health',   color: '#1F4F8F', emoji: '💪' },
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
    School:   { bg: '#E0E9F4', border: '#0A2E5C', text: '#0A2E5C' },
    Work:     { bg: '#E3EDF7', border: '#1A56A0', text: '#1A56A0' },
    Personal: { bg: '#E8F1F9', border: '#3B7DD0', text: '#3B7DD0' },
    Errands:  { bg: '#EDF4FB', border: '#6BA3DD', text: '#6BA3DD' },
    Health:   { bg: '#E1EAF5', border: '#1F4F8F', text: '#1F4F8F' },
  }
  return BUILT_IN_COLORS[name] || { bg: '#EEF3FB', border: '#7A8AA1', text: '#7A8AA1' }
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

export async function updateCategory(id, { name, color, emoji }) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim(), color, emoji })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCategory(id) {
  return supabase.from('categories').delete().eq('id', id)
}
