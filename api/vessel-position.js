// api/vessel-position.js
// Get live AIS position for a vessel by MMSI or IMO
export default async function handler(req, res) {
  const { mmsi, imo } = req.query
  if (!mmsi && !imo) return res.status(400).json({ error: 'mmsi or imo required' })

  const apiKey = process.env.VESSEL_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VESSEL_API_KEY not configured' })

  const id = mmsi || imo
  const idType = mmsi ? 'mmsi' : 'imo'

  try {
    // Get current position
    const posUrl = `https://api.vesselapi.com/v1/vessels/position/${id}?filter.idType=${idType}`
    const posRes = await fetch(posUrl, {
      headers: { 'Authorization': 'Bearer ' + apiKey },
      signal: AbortSignal.timeout(6000),
    })

    if (!posRes.ok) {
      return res.status(posRes.status).json({ error: 'Position not available' })
    }

    const posData = await posRes.json()
    const pos = posData.vessel || posData

    // Also get last port event
    let lastPort = null
    try {
      const evUrl = `https://api.vesselapi.com/v1/portevents/vessel/${id}/last?filter.idType=${idType}`
      const evRes = await fetch(evUrl, {
        headers: { 'Authorization': 'Bearer ' + apiKey },
        signal: AbortSignal.timeout(4000),
      })
      if (evRes.ok) {
        const evData = await evRes.json()
        lastPort = evData.portEvent || null
      }
    } catch(e) {}

    return res.status(200).json({
      latitude:   pos.latitude,
      longitude:  pos.longitude,
      speed:      pos.sog,
      heading:    pos.heading,
      course:     pos.cog,
      nav_status: pos.nav_status,
      timestamp:  pos.timestamp,
      vessel_name: pos.vessel_name || pos.name,
      destination: pos.destination,
      eta:         pos.eta,
      draught:     pos.draught,
      last_port:   lastPort ? {
        port_name:  lastPort.port?.name,
        event:      lastPort.event,
        time:       lastPort.time,
      } : null,
    })
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}
