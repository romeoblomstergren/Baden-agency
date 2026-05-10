import { useState } from 'react'

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function ask(userMessage, { system, history = [], max_tokens = 1500 } = {}) {
    setLoading(true)
    setError(null)
    try {
      const messages = [...history, { role: 'user', content: userMessage }]
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages, system, max_tokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI request failed')
      return data.content
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { ask, loading, error }
}
