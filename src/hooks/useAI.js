import { useState } from 'react'

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [searched, setSearched] = useState(false)

  async function ask(userMessage, { system, history = [], max_tokens = 2000 } = {}) {
    setLoading(true)
    setError(null)
    setSearched(false)
    try {
      const messages = [...history, { role: 'user', content: userMessage }]
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages, system, max_tokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI request failed')
      if (data.search) setSearched(true)
      return data.content
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { ask, loading, error, searched }
}
