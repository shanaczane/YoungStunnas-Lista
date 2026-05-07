import { useState, useRef, useEffect } from 'react'
import { BUILT_IN_CATEGORIES, getCategoryColor, createCategory } from '../lib/categories'
import { CategoryIcon } from '../lib/icons'
import { isChecklist, getChecklistItems, getChecklistTitle, encodeChecklist } from '../lib/ai'

const REMINDER_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '1 hr', value: 60 },
  { label: '1 day', value: 1440 },
]

function minutesToCustom(m) {
  if (m >= 1440 && m % 1440 === 0) return { value: String(m / 1440), unit: 'day' }
  if (m >= 60  && m % 60  === 0) return { value: String(m / 60),   unit: 'hr'  }
  return { value: String(m), unit: 'min' }
}

const PRESET_COLORS = ['#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#06B6D4','#6366F1']

export default function TaskDetailModal({ task, tasks = [], onClose, onUpdate, onDelete, categories = [], onCategoriesChanged, session }) {
  const [taskName, setTaskName] = useState(task.task_name)
  const [category, setCategory] = useState(task.category || 'Personal')
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '')
  const [notes, setNotes] = useState(isChecklist(task) ? '' : (task.notes || ''))
  const [checklistItems, setChecklistItems] = useState(isChecklist(task) ? (getChecklistItems(task) || []) : null)
  const [checklistTitle, setChecklistTitle] = useState(getChecklistTitle(task) ?? task.task_name)
  const [reminderEnabled, setReminderEnabled] = useState(task.reminder_minutes != null)
  const [reminderMinutes, setReminderMinutes] = useState(task.reminder_minutes || 60)
  const isCustomPreset = task.reminder_minutes != null && !REMINDER_PRESETS.some(p => p.value === task.reminder_minutes)
  const initCustom = minutesToCustom(task.reminder_minutes || 30)
  const [customMode, setCustomMode] = useState(isCustomPreset)
  const [customValue, setCustomValue] = useState(initCustom.value)
  const [customUnit, setCustomUnit] = useState(initCustom.unit)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [visible, setVisible] = useState(false)
  const itemRefs = useRef([])
  const sheetRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleClose() {
    if (sheetRef.current) { sheetRef.current.style.transform = ''; sheetRef.current.style.transition = '' }
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function onDragStart(e) {
    drag.current = { startY: e.touches[0].clientY, delta: 0 }
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  function onDragMove(e) {
    if (!drag.current) return
    const delta = Math.max(0, e.touches[0].clientY - drag.current.startY)
    drag.current.delta = delta
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`
  }

  function onDragEnd() {
    if (!drag.current) return
    const { delta } = drag.current
    drag.current = null
    if (delta < 8 || delta > 90) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.28s ease-out'
        sheetRef.current.style.transform = 'translateY(100%)'
      }
      setTimeout(onClose, 280)
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease-out'
        sheetRef.current.style.transform = 'translateY(0)'
        setTimeout(() => { if (sheetRef.current) sheetRef.current.style.transition = '' }, 250)
      }
    }
  }

  const isDirty =
    taskName !== task.task_name ||
    category !== task.category ||
    dueDate !== (task.due_date ? task.due_date.slice(0, 16) : '') ||
    (checklistItems
      ? (JSON.stringify(checklistItems) !== JSON.stringify(getChecklistItems(task) || []) || checklistTitle !== (getChecklistTitle(task) ?? task.task_name))
      : notes !== (task.notes || '')) ||
    reminderEnabled !== (task.reminder_minutes != null) ||
    (reminderEnabled && reminderMinutes !== task.reminder_minutes)

  function handleCustomReminder(val, unit) {
    setCustomValue(val)
    setCustomUnit(unit)
    const n = parseInt(val)
    if (!isNaN(n) && n > 0) {
      const mult = unit === 'day' ? 1440 : unit === 'hr' ? 60 : 1
      setReminderMinutes(n * mult)
    }
  }

  async function handleSave() {
    if (!isDirty) return
    setSaving(true)
    await onUpdate(task.id, {
      task_name: taskName,
      category,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes: checklistItems ? encodeChecklist(checklistItems, checklistTitle) : notes,
      reminder_minutes: reminderEnabled ? reminderMinutes : null,
    })
    setSaving(false)
    handleClose()
  }

  function handleDelete() {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return }
    setVisible(false)
    setTimeout(() => onDelete(task.id), 280)
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) handleClose()
  }

  const usedNames = new Set(tasks.map(t => t.category))
  const allCategories = [
    ...BUILT_IN_CATEGORIES.filter(b => usedNames.has(b.name) || b.name === category),
    ...categories,
  ]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end backdrop-blur-sm transition-colors duration-300 ${visible ? 'bg-black/30' : 'bg-black/0'}`}
      onClick={handleBackdrop}
    >
      <div ref={sheetRef} className={`w-full bg-card-bg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border-t border-divider transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div
          className="flex justify-center pt-3 pb-2 touch-none select-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          <p className="text-slate-400 text-[11px] mt-2 mb-3">
            Created {new Date(task.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(task.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>

          {task.content && task.content !== task.task_name && (
            <div className="bg-accent-pale border border-accent-light/30 rounded-xl px-3 py-2.5 mb-4">
              <p className="text-accent-deep text-[10px] font-semibold uppercase tracking-wider mb-0.5">Original input</p>
              <p className="text-accent-deep/70 text-xs italic">"{task.content}"</p>
            </div>
          )}

          <div className="mb-4">
            <input
              type="text"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full bg-transparent text-slate-900 text-xl font-semibold outline-none border-b border-slate-200 focus:border-accent-deep pb-2 transition-colors"
              placeholder="Task name"
            />
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Category</label>
            <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-hide -mx-1 px-1">
              {allCategories.map(cat => {
                const isSelected = category === cat.name
                const catColors  = getCategoryColor(cat.name, categories)
                return (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.name)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                      isSelected ? '' : 'opacity-60 hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: catColors.bg,
                      color: catColors.text,
                      ...(isSelected ? { outline: `2px solid ${catColors.border}`, outlineOffset: '2px' } : {}),
                    }}
                  >
                    <CategoryIcon name={cat.name} iconId={cat.emoji} size={11} color={catColors.text} />
                    <span>{cat.name}</span>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )
              })}

              {!addingCategory && (
                <button
                  type="button"
                  onClick={() => setAddingCategory(true)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-accent-pale hover:text-accent-deep text-base font-medium transition-colors"
                >+</button>
              )}
            </div>

            {addingCategory && (
              <div className="flex gap-1.5 items-center mt-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && newCatInput.trim() && session) {
                      const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
                      const { error } = await createCategory(session.user.id, { name: newCatInput.trim(), color, emoji: '📁' })
                      if (!error) { setCategory(newCatInput.trim()); onCategoriesChanged?.() }
                      setAddingCategory(false); setNewCatInput('')
                    }
                    if (e.key === 'Escape') { setAddingCategory(false); setNewCatInput('') }
                  }}
                  placeholder="New category name..."
                  autoFocus
                  className="flex-1 bg-slate-50 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 outline-none border border-divider focus:border-accent-deep"
                />
                <button
                  onClick={async () => {
                    if (!newCatInput.trim() || !session) return
                    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
                    const { error } = await createCategory(session.user.id, { name: newCatInput.trim(), color, emoji: '📁' })
                    if (!error) { setCategory(newCatInput.trim()); onCategoriesChanged?.() }
                    setAddingCategory(false); setNewCatInput('')
                  }}
                  disabled={!newCatInput.trim()}
                  className="px-2.5 py-1.5 rounded-xl bg-accent-deep text-white text-xs font-bold disabled:opacity-40"
                >Add</button>
                <button onClick={() => { setAddingCategory(false); setNewCatInput('') }} className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs">✕</button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Due Date &amp; Time</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none border border-divider focus:border-accent-deep transition-colors"
            />
          </div>

          {checklistItems ? (
            <div className="mb-4 bg-slate-50 rounded-xl border border-divider px-4 py-3">
              <input
                type="text"
                value={checklistTitle}
                onChange={e => setChecklistTitle(e.target.value)}
                className="w-full bg-transparent text-slate-900 font-bold text-base outline-none border-b border-transparent focus:border-slate-200 pb-0.5 mb-3 transition-colors placeholder:text-slate-300"
                placeholder="List title"
              />
              <div className="space-y-2.5">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <button
                      type="button"
                      onClick={() => setChecklistItems(prev => prev.map((it, j) => j === i ? { ...it, done: !it.done } : it))}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.done ? 'bg-accent-deep border-accent-deep' : 'border-slate-300'
                      }`}
                    >
                      {item.done && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <input
                      ref={el => { itemRefs.current[i] = el }}
                      type="text"
                      value={item.text}
                      onChange={e => setChecklistItems(prev => prev.map((it, j) => j === i ? { ...it, text: e.target.value } : it))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!item.text.trim()) return
                          setChecklistItems(prev => {
                            const next = [...prev]
                            next.splice(i + 1, 0, { text: '', done: false })
                            return next
                          })
                          setTimeout(() => itemRefs.current[i + 1]?.focus(), 0)
                        } else if (e.key === 'Backspace' && item.text === '') {
                          e.preventDefault()
                          if (checklistItems.length > 1) {
                            setChecklistItems(prev => prev.filter((_, j) => j !== i))
                            setTimeout(() => itemRefs.current[Math.max(0, i - 1)]?.focus(), 0)
                          }
                        }
                      }}
                      onBlur={() => {
                        if (!item.text.trim() && checklistItems.length > 1) {
                          setChecklistItems(prev => prev.filter((_, j) => j !== i))
                        }
                      }}
                      placeholder={`Item ${i + 1}`}
                      className={`flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300 ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setChecklistItems(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-200 hover:text-red-400 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = checklistItems.length
                    setChecklistItems(prev => [...prev, { text: '', done: false }])
                    setTimeout(() => itemRefs.current[next]?.focus(), 0)
                  }}
                  className="flex items-center gap-3 text-slate-400 hover:text-accent-deep transition-colors pt-1"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 text-xs">+</div>
                  <span className="text-sm">Add item</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={3}
                className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none border border-divider focus:border-accent-deep transition-colors resize-none placeholder:text-slate-300"
              />
            </div>
          )}

          <div className="mb-6 bg-slate-50 rounded-xl px-4 py-3 border border-divider">
            <div className="flex items-center justify-between">
              <p className="text-slate-800 text-sm font-medium">Remind me before due</p>
              <button
                onClick={() => setReminderEnabled(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors ${reminderEnabled ? 'bg-accent-deep' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform shadow-sm ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {reminderEnabled && (
              <div className="mt-3">
                <div className="flex gap-2">
                  {REMINDER_PRESETS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setReminderMinutes(opt.value); setCustomMode(false) }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        !customMode && reminderMinutes === opt.value
                          ? 'bg-accent-deep text-white'
                          : 'border border-black/10 text-slate-500 hover:text-accent-deep'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomMode(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      customMode
                        ? 'bg-accent-deep text-white'
                        : 'border border-black/10 text-slate-500 hover:text-accent-deep'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {customMode && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      value={customValue}
                      onChange={e => handleCustomReminder(e.target.value, customUnit)}
                      className="w-20 bg-slate-50 text-slate-800 text-sm rounded-lg px-2.5 py-1.5 outline-none border border-divider focus:border-accent-deep text-center"
                    />
                    <div className="flex gap-1">
                      {['min', 'hr', 'day'].map(unit => (
                        <button
                          key={unit}
                          onClick={() => handleCustomReminder(customValue, unit)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            customUnit === unit
                              ? 'bg-accent-deep text-white'
                              : 'border border-black/10 text-slate-500 hover:text-accent-deep'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                    <span className="text-slate-400 text-xs">before due</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-accent-deep hover:bg-accent-mid text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 mb-3"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}

          <button
            onClick={handleDelete}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              showDeleteConfirm
                ? 'bg-red-500 text-white active:bg-red-600'
                : 'bg-red-50 text-red-500 hover:bg-red-100'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v5"/><path d="M14 11v5"/>
            </svg>
            {showDeleteConfirm ? 'Confirm Delete' : 'Delete Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
