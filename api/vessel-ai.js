// api/vessel-ai.js
// DeepSeek-powered vessel search — smarter than VesselFinder name search.
// POST { query: "MV Spar Gemini" | "9307580" | "bulk carrier Norway 2007" }
// Returns { vessels: [...] }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { query } = body ?? {}
  if (!query) return res.status(400).json({ error: 'query is required' })

  const apiKey = process.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_DEEPSEEK_API_KEY not configured' })

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are a maritime vessel database assistant. When given a vessel name, IMO number, or description, return vessel details as JSON only. No prose, no markdown, just raw JSON.

Return format:
{
  "vessels": [
    {
      "name": "MV SPAR GEMINI",
      "imo": "9307580",
      "mmsi": "257801000",
      "flag": "Norway",
      "vessel_type": "Bulk Carrier",
      "call_sign": "LAFP6",
      "gt": "32474",
      "dwt": "53113",
      "loa": "190",
      "beam": "32",
      "year_built": "2007"
    }
  ]
}

If you don't know the exact details, use your best knowledge. Always return valid JSON. Return up to 3 vessels if the query is ambiguous.`
          },
          {
            role: 'user',
            content: `Find vessel details for: ${query}`
          }
        ]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message ?? 'DeepSeek error' })

    const text = data.choices?.[0]?.message?.content ?? '{}'
    // Strip markdown fences if present
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    try {
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        return res.status(200).json(JSON.parse(match[0]))
      }
      return res.status(200).json({ vessels: [] })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
