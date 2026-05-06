// ─── Checklist helpers ────────────────────────────────────────────────────────
export const CHECKLIST_PREFIX = '__checklist__'

export function isChecklist(task) {
  return task?.notes?.startsWith(CHECKLIST_PREFIX) ?? false
}

export function getChecklistItems(task) {
  if (!isChecklist(task)) return null
  try { return JSON.parse(task.notes.slice(CHECKLIST_PREFIX.length)) } catch { return null }
}

export function encodeChecklist(items) {
  return CHECKLIST_PREFIX + JSON.stringify(items)
}

/**
 * Returns { title, items } if input looks like a list, otherwise null.
 * Conservative — requires a colon separator OR 3+ commas to avoid false positives.
 */
export function detectChecklist(input) {
  const commas = (input.match(/,/g) || []).length
  const hasColon = input.includes(':')

  if (!hasColon && commas < 2) return null

  // Skip plain sentences that happen to have commas (e.g. "call John, it's urgent")
  // Heuristic: if average segment length > 30 chars it's prose, not a list
  const segments = input.split(/,|:/).map(s => s.trim()).filter(Boolean)
  const avgLen = segments.reduce((a, s) => a + s.length, 0) / segments.length
  if (avgLen > 35) return null

  let title = 'Checklist'
  let itemsText = input

  // "Title: item1, item2" pattern
  const colonMatch = input.match(/^([^,\n]{2,50}):\s*(.+)$/s)
  if (colonMatch) {
    title = colonMatch[1].trim()
    itemsText = colonMatch[2]
  } else if (commas >= 2) {
    const firstCommaIdx = input.indexOf(',')
    const firstPart = input.slice(0, firstCommaIdx).trim()
    // Only treat first segment as title if it has no leading digit (not an item itself)
    if (!/^\d/.test(firstPart) && firstPart.split(' ').length <= 6) {
      title = firstPart
      itemsText = input.slice(firstCommaIdx + 1)
    }
  }

  const items = itemsText
    .split(/,|\s+and\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 100)

  if (items.length < 2) return null

  return { title, items: items.map(text => ({ text, done: false })) }
}

// ─── Ollama / parse ───────────────────────────────────────────────────────────
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'

const DAY_ABBREVS = {
  'mon': 'monday', 'tue': 'tuesday', 'tues': 'tuesday',
  'wed': 'wednesday', 'thu': 'thursday', 'thurs': 'thursday',
  'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday',
}

const TIME_CONTEXT = {
  'morning':   9,
  'afternoon': 12,
  'evening':   18,
  'tonight':   21,
  'night':     21,
  'noon':      12,
  'midnight':  0,
}

export async function parseTask(input) {
  const today = toLocalISO(new Date()).split('T')[0]

  const prompt = `Today is ${today}. Parse this task input and return ONLY a valid JSON object with exactly these fields:
{
  "task": "clean actionable task name as a string",
  "due_date": "ISO 8601 date-time string if a date/time is mentioned, otherwise null",
  "category": "one of: School, Work, Personal, Errands, Health — inferred from context",
  "assignee": "person's first name if mentioned in the input, otherwise null"
}

Rules:
- "task" should be a clean, actionable version of the input
- Day abbreviations: Mon=Monday, Tue/Tues=Tuesday, Wed=Wednesday, Thu/Thurs=Thursday, Fri=Friday, Sat=Saturday, Sun=Sunday
- For due_date: resolve relative dates using today's date. "Friday" or "Fri" = next/upcoming Friday.
- Time rules (strict priority order):
  1. Explicit time given (e.g. "10am", "3:30pm", "14:00") → use that exact time, never override it
  2. Time-of-day word used: morning=09:00, afternoon=12:00, evening=18:00, night/tonight=21:00, noon=12:00
  3. No time context at all → default to 09:00
- "3 in the afternoon" = 15:00, "10 in the morning" = 10:00
- Category inference: thesis/study/class/homework → School; meeting/client/report/work → Work; groceries/buy/errand → Errands; gym/doctor/health → Health; everything else → Personal
- Return ONLY the JSON object. No markdown. No explanation.

Input: "${input.replace(/"/g, "'")}"`

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
      }),
    })

    if (!res.ok) throw new Error(`Ollama error ${res.status}`)

    const data = await res.json()
    const parsed = JSON.parse(data.response)
    // Always override Ollama's date with our reliable regex extractor —
    // LLMs are poor at calendar math and consistently return wrong dates
    const fallback = fallbackParse(input)
    parsed.due_date = fallback.due_date
    return parsed
  } catch {
    return fallbackParse(input)
  }
}

function toLocalISO(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:00`
}

function fallbackParse(input) {
  // Normalize day abbreviations for all processing (preserves original casing)
  let normalized = input
  for (const [abbrev, full] of Object.entries(DAY_ABBREVS)) {
    normalized = normalized.replace(new RegExp(`\\b${abbrev}\\b`, 'gi'), full)
  }
  const lower = normalized.toLowerCase()

  let category = 'Personal'
  if (/thesis|study|class|homework|assignment|exam|school|university|course/.test(lower)) category = 'School'
  else if (/meeting|client|report|work|project|deadline|prd|sprint|office|email/.test(lower)) category = 'Work'
  else if (/groceries|buy|errand|pick up|drop off|store|shop/.test(lower)) category = 'Errands'
  else if (/gym|doctor|health|workout|medicine|hospital|dentist|run|exercise/.test(lower)) category = 'Health'

  // Step 1: explicit time (highest priority — always wins)
  let hours = null
  let minutes = 0
  const explicitTime = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
    || lower.match(/\b(\d{2}):(\d{2})\b/)
  if (explicitTime) {
    hours = parseInt(explicitTime[1])
    minutes = parseInt(explicitTime[2] || '0')
    const meridiem = explicitTime[3]
    if (meridiem === 'pm' && hours !== 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
  }

  // Step 2: natural language time phrases ("3 in the afternoon", "10 in the morning")
  if (hours === null) {
    const naturalMatch = lower.match(/\b(\d{1,2})\s+in the\s+(morning|afternoon|evening)\b/)
    if (naturalMatch) {
      hours = parseInt(naturalMatch[1])
      const period = naturalMatch[2]
      if (period === 'afternoon' && hours < 12) hours += 12
      if (period === 'evening' && hours < 12) hours += 12
    }
  }

  // Step 3: time-of-day context words
  if (hours === null) {
    for (const [word, h] of Object.entries(TIME_CONTEXT)) {
      if (lower.includes(word)) { hours = h; break }
    }
  }

  // Step 4: default
  if (hours === null) hours = 9

  let due_date = null
  const now = new Date()
  if (/\btoday\b/.test(lower)) {
    due_date = toLocalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes))
  } else if (/\btomorrow\b/.test(lower)) {
    due_date = toLocalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes))
  } else {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now)
        const diff = (i - now.getDay() + 7) % 7 || 7
        target.setDate(now.getDate() + diff)
        target.setHours(hours, minutes, 0, 0)
        due_date = toLocalISO(target)
        break
      }
    }
  }

  let assignee = null
  const assigneeMatch = input.match(/\b([A-Z][a-z]+)\s+(finalize|complete|handle|review|submit|check|do|prepare|send|finish)/)
    || input.match(/(assign(?:ed)? to|for)\s+([A-Z][a-z]+)/i)
  if (assigneeMatch) assignee = assigneeMatch[1] || assigneeMatch[2]

  const task = normalized
    .replace(/\b(by|before|on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|eod|end of (day|month|week))\b/gi, '')
    .replace(/\b(today|tomorrow)\b/gi, '')
    .replace(/\b(this|next)\s+week\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ') || input

  return { task, due_date, category, assignee }
}
