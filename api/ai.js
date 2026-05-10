export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { messages, system, max_tokens = 1500 } = body ?? {}
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const apiKey = process.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_DEEPSEEK_API_KEY not configured' })

  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens,
        messages: fullMessages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('DeepSeek error:', data)
      return res.status(response.status).json({ error: data?.error?.message ?? 'DeepSeek API error' })
    }

    const content = data.choices?.[0]?.message?.content ?? ''
    return res.status(200).json({ content })

  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
