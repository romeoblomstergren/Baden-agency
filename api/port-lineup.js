// api/port-lineup.js
// Port lineup using DeepSeek with web search enabled
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { port, country } = body ?? {}
  if (!port) return res.status(400).json({ error: 'port is required' })

  const apiKey = process.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_DEEPSEEK_API_KEY not configured' })

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are a maritime shipping expert and port agent with deep knowledge of vessel movements worldwide.
When asked about a port lineup, provide realistic vessel information based on your knowledge of:
- Typical vessel traffic at that port
- Common shipping routes and cargo types
- Vessel sizes appropriate for the port
- Realistic ETAs and vessel names

Return ONLY valid JSON with no markdown, no explanation, no code fences.
Schema: {
  "vessels": [{
    "name": "MV VESSEL NAME",
    "imo": "1234567",
    "flag": "Panama",
    "vessel_type": "Bulk Carrier",
    "dwt": "45000",
    "cargo": "Wheat",
    "eta": "2026-05-12",
    "etd": "2026-05-15", 
    "status": "Expected",
    "principal": "Cargill",
    "agent": null,
    "berth": null
  }],
  "port_info": {
    "name": "...",
    "country": "...",
    "typical_cargo": "...",
    "max_draft": "...",
    "note": "..."
  }
}`
          },
          {
            role: 'user',
            content: `Generate a realistic port lineup for ${port}${country ? ', ' + country : ''} as of today.
Include 10-15 vessels that would typically be expected, alongside, or recently arrived.
Use realistic vessel names (MV prefix for bulk/general, MT for tankers), IMO numbers (7 digits starting with 9), appropriate flags and cargo for this port.
Status options: Expected, Alongside, At Anchorage, Sailed.
Make ETAs realistic relative to today's date (May 2026).`
          }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err?.error?.message ?? 'DeepSeek error' })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? '{}'

    // Strip any markdown fences
    const clean = text
      .replace(/^```json\s*/im, '')
      .replace(/^```\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim()

    try {
      const parsed = JSON.parse(clean)
      return res.status(200).json({
        port,
        country: country || parsed.port_info?.country || null,
        vessels: parsed.vessels || [],
        port_info: parsed.port_info || null,
        source: 'AI estimate — based on typical port traffic',
      })
    } catch {
      // Try extracting JSON object
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        return res.status(200).json({
          port,
          vessels: parsed.vessels || [],
          port_info: parsed.port_info || null,
          source: 'AI estimate — based on typical port traffic',
        })
      }
      return res.status(200).json({ port, vessels: [], source: 'Parse error', error: 'Could not parse AI response' })
    }
  } catch (err) {
    console.error('Port lineup error:', err)
    return res.status(500).json({ error: err.message })
  }
}
