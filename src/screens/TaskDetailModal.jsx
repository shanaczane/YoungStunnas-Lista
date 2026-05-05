import { useState } from 'react'
import { CATEGORY_COLORS } from '../lib/utils'

const REMINDER_OPTIONS = [
  { label: '15 min before', value: 15 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
]

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }) {
  const [taskName, setTaskName] = useState(task.task_name)
  const [category, setCategory] = useState(task.category || 'Personal')
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '')
  const [notes, setNotes] = useState(task.notes || '')
  const [reminderEnabled, setReminderEnabled] = useState(task.reminder_minutes != null)
  const [reminderMinutes, setReminderMinutes] = useState(task.reminder_minutes || 60)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const isDirty =
    taskName !== task.task_name ||
    category !== task.category ||
    dueDate !== (task.due_date ? task.due_date.slice(0, 16) : '') ||
    notes !== (task.notes || '') ||
    reminderEnabled !== (task.reminder_minutes != null) ||
    (reminderEnabled && reminderMinutes !== task.reminder_minutes)

  async function handleSave() {
    if (!isDirty) return
    setSaving(true)
    await onUpdate(task.id, {
      task_name: taskName,
      category,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes,
      reminder_minutes: reminderEnabled ? reminderMinutes : null,
    })
    setSaving(false)
    onClose()
  }

  function handleDelete() {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return }
    onDelete(task.id)
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/30 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border-t border-black/10">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {task.content && task.content !== task.task_name && (
            <div className="bg-accent-pale border border-accent-light/30 rounded-xl px-3 py-2.5 mb-4 mt-2">
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

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none border border-black/10 focus:border-accent-deep transition-colors"
              >
                {['School','Work','Personal','Errands','Health'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div
              className="w-3 self-stretch rounded-full flex-shrink-0 mt-6"
              style={{ backgroundColor: colors.border }}
            />
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Due Date &amp; Time</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none border border-black/10 focus:border-accent-deep transition-colors"
            />
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2.5 outline-none border border-black/10 focus:border-accent-deep transition-colors resize-none placeholder:text-slate-300"
            />
          </div>

          <div className="mb-6 bg-slate-50 rounded-xl px-4 py-3 border border-black/10">
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
              <div className="flex gap-2 mt-3">
                {REMINDER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReminderMinutes(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      reminderMinutes === opt.value
                        ? 'bg-accent-deep text-white'
                        : 'border border-black/10 text-slate-500 hover:text-accent-deep'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
              showDeleteConfirm
                ? 'bg-red-50 text-red-500 border border-red-200'
                : 'border border-black/10 text-slate-400 hover:text-red-500 hover:border-red-200'
            }`}
          >
            {showDeleteConfirm ? 'Tap again to delete' : 'Delete Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
