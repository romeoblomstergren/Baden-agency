// api/ai.js
// Uses deepseek-chat with search_enabled for native web search
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { messages, system, max_tokens = 2000 } = body ?? {}
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'messages array is required' })

  const apiKey = process.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_DEEPSEEK_API_KEY not configured' })

  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  try {
    // Try deepseek-chat with search_enabled (native web search, no tool call markup)
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
        search_enabled: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      // If search_enabled not supported, fall back to plain chat
      if (response.status === 400 || response.status === 422) {
        const fallback = await fetch('https://api.deepseek.com/chat/completions', {
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
        const fallbackData = await fallback.json()
        const content = fallbackData.choices?.[0]?.message?.content ?? ''
        return res.status(200).json({ content, search: false })
      }
      return res.status(response.status).json({ error: err?.error?.message ?? 'DeepSeek error' })
    }

    const data = await response.json()

    // Clean response — strip any raw tool call markup that leaked through
    let content = data.choices?.[0]?.message?.content ?? ''
    content = content
      .replace(/<｜｜DSML｜｜tool_calls>[\s\S]*?<\/｜｜DSML｜｜tool_calls>/g, '')
      .replace(/<｜｜DSML｜｜[\s\S]*?>/g, '')
      .replace(/<\/｜｜DSML｜｜[\s\S]*?>/g, '')
      .trim()

    // Check if search was actually used
    const searchUsed = data.choices?.[0]?.message?.search_results?.length > 0
    const sources = data.choices?.[0]?.message?.search_results?.map(r => r.url).slice(0, 3) || []

    return res.status(200).json({ content, search: searchUsed, sources })

  } catch (err) {
    console.error('AI error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
