const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'

export async function parseTask(input) {
  const today = new Date().toISOString().split('T')[0]

  const prompt = `Today is ${today}. Parse this task input and return ONLY a valid JSON object with exactly these fields:
{
  "task": "clean actionable task name as a string",
  "due_date": "ISO 8601 date-time string if a date/time is mentioned, otherwise null",
  "category": "one of: School, Work, Personal, Errands, Health — inferred from context",
  "assignee": "person's first name if mentioned in the input, otherwise null"
}

Rules:
- "task" should be a clean, actionable version of the input
- For due_date: resolve relative dates using today's date. "Friday" = upcoming Friday, "tomorrow" = tomorrow. Default time to 09:00 if no time is given.
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
    return JSON.parse(data.response)
  } catch {
    return fallbackParse(input)
  }
}

function fallbackParse(input) {
  const lower = input.toLowerCase()

  let category = 'Personal'
  if (/thesis|study|class|homework|assignment|exam|school|university|course/.test(lower)) category = 'School'
  else if (/meeting|client|report|work|project|deadline|prd|sprint|office|email/.test(lower)) category = 'Work'
  else if (/groceries|buy|errand|pick up|drop off|store|shop/.test(lower)) category = 'Errands'
  else if (/gym|doctor|health|workout|medicine|hospital|dentist|run|exercise/.test(lower)) category = 'Health'

  // Extract time (e.g. "10am", "2:30pm", "14:00", "10am deadline")
  let hours = 9, minutes = 0
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
    || lower.match(/\b(\d{2}):(\d{2})\b/)
  if (timeMatch) {
    hours = parseInt(timeMatch[1])
    minutes = parseInt(timeMatch[2] || '0')
    const meridiem = timeMatch[3]
    if (meridiem === 'pm' && hours !== 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
  }

  let due_date = null
  const now = new Date()
  if (/\btoday\b/.test(lower)) {
    due_date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).toISOString()
  } else if (/\btomorrow\b/.test(lower)) {
    due_date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes).toISOString()
  } else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now)
        const diff = (i - now.getDay() + 7) % 7 || 7
        target.setDate(now.getDate() + diff)
        target.setHours(hours, minutes, 0, 0)
        due_date = target.toISOString()
        break
      }
    }
  }

  let assignee = null
  const assigneeMatch = input.match(/\b([A-Z][a-z]+)\s+(finalize|complete|handle|review|submit|check|do|prepare|send|finish)/)
    || input.match(/(assign(?:ed)? to|for)\s+([A-Z][a-z]+)/i)
  if (assigneeMatch) assignee = assigneeMatch[1] || assigneeMatch[2]

  const task = input
    .replace(/\b(by|before|on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|eod|end of (day|month|week))\b/gi, '')
    .replace(/\b(today|tomorrow)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ') || input

  return { task, due_date, category, assignee }
}
