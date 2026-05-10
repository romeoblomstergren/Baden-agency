// api/ai.js  — place at repo ROOT (next to package.json)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { messages, system, max_tokens = 1500 } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens, system, messages }),
    })
    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.error?.message ?? 'Anthropic error' })
    }
    const data = await response.json()
    const content = data.content?.map(b => b.text ?? '').join('') ?? ''
    return res.status(200).json({ content })
  } catch (err) {
    console.error('AI proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
