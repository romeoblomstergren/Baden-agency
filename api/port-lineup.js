// api/port-lineup.js
// Port lineup with fallback chain: AISHub → VesselFinder → DeepSeek
// POST { port: "Tema", country: "Ghana" }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { port, country } = body ?? {}
  if (!port) return res.status(400).json({ error: 'port is required' })

  const results = { port, country, vessels: [], source: null, error: null }

  // ── 1. Try AISHub ──────────────────────────────────────────────────────────
  const aishubUser = process.env.AISHUB_USERNAME
  if (aishubUser) {
    try {
      const url = `https://data.aishub.net/ws.php?username=${aishubUser}&format=1&output=json&compress=0&latmin=-90&latmax=90&lonmin=-180&lonmax=180`
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const data = await r.json()
        const vessels = (Array.isArray(data) ? data.flat() : [])
          .filter(v => {
            const dest = (v.DESTINATION || '').toLowerCase()
            const portLower = port.toLowerCase()
            return dest.includes(portLower) || dest.includes(portLower.slice(0, 4))
          })
          .slice(0, 20)
          .map(v => ({
            name:        v.NAME || '—',
            imo:         v.IMO  || null,
            mmsi:        v.MMSI || null,
            flag:        v.FLAG || null,
            vessel_type: v.TYPE_NAME || null,
            destination: v.DESTINATION || null,
            eta:         v.ETA || null,
            speed:       v.SPEED != null ? (v.SPEED / 10).toFixed(1) + ' kn' : null,
            status:      v.STATUS || null,
            lat:         v.LATITUDE  != null ? v.LATITUDE  / 600000 : null,
            lon:         v.LONGITUDE != null ? v.LONGITUDE / 600000 : null,
          }))

        if (vessels.length > 0) {
          results.vessels = vessels
          results.source = 'AISHub (live AIS)'
          return res.status(200).json(results)
        }
      }
    } catch (e) {
      console.log('AISHub failed:', e.message)
    }
  }

  // ── 2. Try VesselFinder port calls ────────────────────────────────────────
  try {
    const query = `${port}${country ? ' ' + country : ''}`
    const vfUrl = `https://www.vesselfinder.com/api/pub/portcalls/search?s=${encodeURIComponent(query)}`
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(vfUrl)}`
    const r = await fetch(proxy, { signal: AbortSignal.timeout(10000) })
    if (r.ok) {
      const data = await r.json()
      const parsed = JSON.parse(data.contents || '[]')
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Get port calls for first match
        const portId = parsed[0]?.id || parsed[0]?.locode
        if (portId) {
          const callsUrl = `https://www.vesselfinder.com/api/pub/portcalls/${portId}`
          const callsProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(callsUrl)}`
          const callsR = await fetch(callsProxy, { signal: AbortSignal.timeout(10000) })
          if (callsR.ok) {
            const callsData = await callsR.json()
            const calls = JSON.parse(callsData.contents || '[]')
            if (Array.isArray(calls) && calls.length > 0) {
              results.vessels = calls.slice(0, 20).map(v => ({
                name:        v.name || v.vessel_name || '—',
                imo:         v.imo  || null,
                mmsi:        v.mmsi || null,
                flag:        v.flag || null,
                vessel_type: v.type || v.vessel_type || null,
                eta:         v.eta  || v.arrival || null,
                etd:         v.etd  || v.departure || null,
                status:      v.status || null,
                cargo:       v.cargo || null,
              }))
              results.source = 'VesselFinder'
              return res.status(200).json(results)
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('VesselFinder failed:', e.message)
  }

  // ── 3. DeepSeek fallback ──────────────────────────────────────────────────
  const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY
  if (deepseekKey) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + deepseekKey },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: `You are a maritime shipping expert with knowledge of port operations worldwide.
Return ONLY valid JSON, no prose, no markdown fences.
Format: { "vessels": [ { "name": "", "imo": "", "flag": "", "vessel_type": "", "eta": "", "cargo": "", "principal": "", "status": "Expected|Alongside|In Port" } ] }`
            },
            {
              role: 'user',
              content: `List vessels currently expected, alongside, or recently arrived at ${port}${country ? ', ' + country : ''}.
Include: bulk carriers, tankers, container ships, general cargo.
Based on your knowledge of typical traffic at this port and recent shipping activity.
Return up to 15 vessels. Use realistic vessel names, IMO numbers, and ETAs.`
            }
          ]
        })
      })
      if (r.ok) {
        const data = await r.json()
        const text = data.choices?.[0]?.message?.content ?? '{}'
        const clean = text.replace(/```json\s*/i, '').replace(/```\s*/i, '').replace(/```\s*$/i, '').trim()
        try {
          const parsed = JSON.parse(clean)
          results.vessels = parsed.vessels || []
          results.source = 'AI estimate (DeepSeek) — not real-time'
          return res.status(200).json(results)
        } catch {
          const match = text.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            results.vessels = parsed.vessels || []
            results.source = 'AI estimate (DeepSeek) — not real-time'
            return res.status(200).json(results)
          }
        }
      }
    } catch (e) {
      console.log('DeepSeek failed:', e.message)
    }
  }

  // All sources failed
  results.error = 'All data sources unavailable'
  return res.status(200).json(results)
}
