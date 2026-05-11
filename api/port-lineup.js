// api/port-lineup.js
// Real port lineup from VesselAPI AIS data, DeepSeek as fallback
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { port, country, locode } = body ?? {}
  if (!port && !locode) return res.status(400).json({ error: 'port or locode is required' })

  const vesselKey = process.env.VESSEL_API_KEY
  const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY

  // ── 1. Try VesselAPI port events (real AIS data) ──
  if (vesselKey && locode) {
    try {
      // Get vessels with ETA to this port in next 7 days
      const now = new Date()
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const url = `https://api.vesselapi.com/v1/portevents?` + new URLSearchParams({
        'filter.portUnlocode': locode,
        'filter.eventType': 'Arrival',
        'filter.time.from': now.toISOString(),
        'filter.time.to': in7days.toISOString(),
        'limit': '20',
      })
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + vesselKey },
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        const data = await r.json()
        const events = data.portEvents || data.data || []
        if (events.length > 0) {
          const vessels = events.map(e => ({
            name:        e.vessel?.name || e.vesselName || '—',
            imo:         e.vessel?.imo  || e.imo  || null,
            mmsi:        e.vessel?.mmsi || e.mmsi || null,
            flag:        e.vessel?.flag || null,
            vessel_type: e.vessel?.type || null,
            eta:         e.eta || e.time || null,
            status:      'Expected',
            source:      'AIS',
          }))
          return res.status(200).json({ port, locode, vessels, source: 'VesselAPI (live AIS)' })
        }
      }
    } catch(e) { console.log('VesselAPI port events failed:', e.message) }
  }

  // Also try vessels currently in port
  if (vesselKey && locode) {
    try {
      const url = `https://api.vesselapi.com/v1/portevents?` + new URLSearchParams({
        'filter.portUnlocode': locode,
        'filter.eventType': 'Arrival',
        'limit': '20',
      })
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + vesselKey },
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        const data = await r.json()
        const events = (data.portEvents || data.data || []).slice(0, 20)
        if (events.length > 0) {
          const vessels = events.map(e => ({
            name:        e.vessel?.name || e.vesselName || '—',
            imo:         e.vessel?.imo  || e.imo  || null,
            mmsi:        e.vessel?.mmsi || e.mmsi || null,
            flag:        e.vessel?.flag || null,
            vessel_type: e.vessel?.type || null,
            eta:         e.eta || e.time || null,
            status:      'At Anchorage',
            source:      'AIS',
          }))
          return res.status(200).json({ port, locode, vessels, source: 'VesselAPI (live AIS)' })
        }
      }
    } catch(e) { console.log('VesselAPI current vessels failed:', e.message) }
  }

  // ── 1b. Try VesselAPI vessels with this port as destination ──
  if (vesselKey && port) {
    try {
      const url = `https://api.vesselapi.com/v1/location/vessels/bounding-box?` + new URLSearchParams({
        'filter.destination': port.toUpperCase(),
        'limit': '20',
      })
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + vesselKey },
        signal: AbortSignal.timeout(6000),
      })
      if (r.ok) {
        const data = await r.json()
        const vessels = (data.vessels || []).filter(v =>
          (v.destination || '').toUpperCase().includes(port.toUpperCase().slice(0, 4))
        ).map(v => ({
          name:        v.vessel_name || v.name || '—',
          imo:         v.imo  || null,
          mmsi:        v.mmsi || null,
          flag:        null,
          vessel_type: null,
          eta:         v.eta  || null,
          speed:       v.sog  ? Number(v.sog).toFixed(1) + ' kn' : null,
          status:      'Expected',
        }))
        if (vessels.length > 0) {
          return res.status(200).json({ port, locode, vessels, source: 'VesselAPI (live AIS — destination match)' })
        }
      }
    } catch(e) { console.log('VesselAPI destination search failed:', e.message) }
  }

  // ── 1b. Try VesselAPI vessels with this port as destination ──
  if (vesselKey && port) {
    try {
      const url = `https://api.vesselapi.com/v1/location/vessels/bounding-box?` + new URLSearchParams({
        'filter.destination': port.toUpperCase(),
        'limit': '20',
      })
      const r = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + vesselKey },
        signal: AbortSignal.timeout(6000),
      })
      if (r.ok) {
        const data = await r.json()
        const vessels = (data.vessels || []).filter(v =>
          (v.destination || '').toUpperCase().includes(port.toUpperCase().slice(0, 4))
        ).map(v => ({
          name:        v.vessel_name || v.name || '—',
          imo:         v.imo  || null,
          mmsi:        v.mmsi || null,
          flag:        null,
          vessel_type: null,
          eta:         v.eta  || null,
          speed:       v.sog  ? Number(v.sog).toFixed(1) + ' kn' : null,
          status:      'Expected',
        }))
        if (vessels.length > 0) {
          return res.status(200).json({ port, locode, vessels, source: 'VesselAPI (live AIS — destination match)' })
        }
      }
    } catch(e) { console.log('VesselAPI destination search failed:', e.message) }
  }

  // ── 2. DeepSeek fallback ──
  if (deepseekKey) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + deepseekKey },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 1500,
          search_enabled: true,
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON, no markdown. Schema: {"vessels":[{"name":"","imo":"","flag":"","vessel_type":"","eta":"","cargo":"","status":"Expected"}]}' },
            { role: 'user', content: `List 10-15 vessels currently expected or alongside at ${port}${country ? ', ' + country : ''}. Use web search for current data. Return JSON only.` }
          ]
        })
      })
      if (r.ok) {
        const data = await r.json()
        const text = data.choices?.[0]?.message?.content ?? '{}'
        const clean = text.replace(/```json\s*/i,'').replace(/```\s*/i,'').replace(/```\s*$/i,'').trim()
        try {
          const parsed = JSON.parse(clean)
          return res.status(200).json({ port, vessels: parsed.vessels || [], source: 'AI estimate (DeepSeek) — not real-time' })
        } catch {
          const match = text.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            return res.status(200).json({ port, vessels: parsed.vessels || [], source: 'AI estimate (DeepSeek) — not real-time' })
          }
        }
      }
    } catch(e) { console.log('DeepSeek failed:', e.message) }
  }

  return res.status(200).json({ port, vessels: [], source: 'No data available', error: 'All sources failed' })
}
