export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'

  try {
    const body = await req.json()
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, ...body, stream: false }),
    })
    if (!res.ok) return new Response(`Ollama error ${res.status}`, { status: 502 })
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
