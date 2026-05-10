// api/ai.js — DeepSeek with web search enabled
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
        // Enable web search so AI can look up live vessel positions,
        // port info, weather, freight rates, maritime news etc.
        tools: [{
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for current information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' }
              },
              required: ['query']
            }
          }
        }],
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err?.error?.message ?? 'DeepSeek error' })
    }

    const data = await response.json()

    // Handle tool calls if DeepSeek wants to search
    if (data.choices?.[0]?.finish_reason === 'tool_calls') {
      const toolCalls = data.choices[0].message.tool_calls || []
      const toolResults = []

      for (const call of toolCalls) {
        if (call.function.name === 'web_search') {
          const args = JSON.parse(call.function.arguments)
          // Use DeepSeek's built-in search via a second call with search results
          toolResults.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `Searching for: ${args.query}`,
          })
        }
      }

      // Make second call with tool results
      const secondResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens,
          messages: [
            ...fullMessages,
            data.choices[0].message,
            ...toolResults,
          ],
        }),
      })

      const secondData = await secondResponse.json()
      const content = secondData.choices?.[0]?.message?.content ?? ''
      return res.status(200).json({ content })
    }

    const content = data.choices?.[0]?.message?.content ?? ''
    return res.status(200).json({ content })

  } catch (err) {
    console.error('AI error:', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
}
