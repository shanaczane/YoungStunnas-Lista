// ─── Checklist helpers ────────────────────────────────────────────────────────
export const CHECKLIST_PREFIX = '__checklist__'

export function isChecklist(task) {
  return task?.notes?.startsWith(CHECKLIST_PREFIX) ?? false
}

export function getChecklistItems(task) {
  if (!isChecklist(task)) return null
  try {
    const data = JSON.parse(task.notes.slice(CHECKLIST_PREFIX.length))
    return Array.isArray(data) ? data : (data.items ?? null)
  } catch { return null }
}

export function getChecklistTitle(task) {
  if (!isChecklist(task)) return null
  try {
    const data = JSON.parse(task.notes.slice(CHECKLIST_PREFIX.length))
    return Array.isArray(data) ? null : (data.title ?? null)
  } catch { return null }
}

export function encodeChecklist(items, title = '') {
  return CHECKLIST_PREFIX + JSON.stringify({ title, items })
}

/**
 * Returns { title, items } if input looks like a list, otherwise null.
 * Conservative — requires a colon separator OR 3+ commas to avoid false positives.
 */
export function detectChecklist(input) {
  // Strip surrounding quotes from the whole input
  input = input.replace(/^["']|["']$/g, '').trim()

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

  title = title.replace(/^["']|["']$/g, '').trim()

  const items = itemsText
    .split(/,|\s+and\s+/i)
    .map(s => s.replace(/^["']|["']$/g, '').trim())
    .filter(s => s.length > 0 && s.length < 100)

  if (items.length < 2) return null

  return { title, items: items.map(text => ({ text, done: false })) }
}

// ─── Clean raw input for note field ──────────────────────────────────────────
export function cleanInput(input) {
  const ABBREVS = {
    'mon': 'Monday', 'tue': 'Tuesday', 'tues': 'Tuesday',
    'wed': 'Wednesday', 'thu': 'Thursday', 'thurs': 'Thursday',
    'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
  }
  let result = input.trim()

  // Expand day abbreviations (preserve original casing pattern)
  for (const [abbrev, full] of Object.entries(ABBREVS)) {
    result = result.replace(
      new RegExp(`\\b${abbrev}\\b`, 'gi'),
      m => m[0] === m[0].toUpperCase() ? full : full.toLowerCase()
    )
  }

  // Resolve "this week" day → actual date string
  const now = new Date()
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  result = result.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+this\s+week\b/gi, (_, day) => {
    const idx = days.indexOf(day.toLowerCase())
    const diff = (idx - now.getDay() + 7) % 7 || 7
    const target = new Date(now)
    target.setDate(now.getDate() + diff)
    return target.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  // Resolve "next [day]"
  result = result.replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, (_, day) => {
    const idx = days.indexOf(day.toLowerCase())
    const diff = (idx - now.getDay() + 7) % 7 || 7
    const target = new Date(now)
    target.setDate(now.getDate() + diff)
    return target.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1)

  return result.replace(/\s+/g, ' ').trim()
}

// ─── Ollama / parse ───────────────────────────────────────────────────────────
// In production (Vercel), calls go through /api/* serverless proxy to avoid CORS/HTTPS issues.
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'
const IS_PROD = import.meta.env.PROD

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

export async function parseImageList(base64Image) {
  const model = import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava'
  const prompt = `Look at this image carefully. It shows a list with a title and several items.
Read ALL the text visible — the heading/title AND every item listed below it.
Return ONLY one line in this exact format: Title: item1, item2, item3, item4
Example: Things to buy: 2 pencil, 3 eraser, 4 notebooks, 2 ballpens
No explanation. No bullet points. No extra lines. Just the single comma-separated line.`

  const payload = { prompt, images: [base64Image], stream: false }
  try {
    const url = IS_PROD ? '/api/parse-image' : `${OLLAMA_URL}/api/generate`
    const body = IS_PROD ? JSON.stringify(payload) : JSON.stringify({ model, ...payload })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) throw new Error(`error ${res.status}`)
    const data = await res.json()
    const raw = data.response?.trim() || null
    if (!raw) return null
    return normalizeImageResponse(raw)
  } catch {
    return null
  }
}

function normalizeImageResponse(text) {
  // Strip surrounding quotes
  text = text.replace(/^["']|["']$/g, '').trim()

  // If already in "Title: item, item" format, return as-is
  if (text.includes(':') && text.includes(',')) return text

  // Handle newline-separated response: first line = title, rest = items
  const lines = text.split(/\n/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean)
  if (lines.length >= 2) {
    const title = lines[0].replace(/:$/, '').trim()
    const items = lines.slice(1).join(', ')
    return `${title}: ${items}`
  }

  return text
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
    const url = IS_PROD ? '/api/parse-task' : `${OLLAMA_URL}/api/generate`
    const bodyObj = IS_PROD
      ? { prompt, stream: false, format: 'json' }
      : { model: OLLAMA_MODEL, prompt, stream: false, format: 'json' }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    })

    if (!res.ok) throw new Error(`error ${res.status}`)

    const data = await res.json()
    const parsed = JSON.parse(data.response)
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
