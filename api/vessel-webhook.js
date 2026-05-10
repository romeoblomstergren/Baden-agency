// api/vessel-webhook.js
// VesselAPI webhook — fires when a vessel arrives or departs
// Setup in VesselAPI dashboard: point webhook to https://portal.baden-agency.com/api/vessel-webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).end() }
  }

  const { event, vessel, port } = body ?? {}
  if (!event || !vessel) return res.status(400).end()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  const mmsi = vessel.mmsi?.toString()
  const imo  = vessel.imo?.toString()
  const portName = port?.name || ''

  // Map VesselAPI event to Baden Agency vessel_status
  const newStatus = event === 'Arrival' ? 'Alongside' : event === 'Departure' ? 'Underway' : null
  if (!newStatus) return res.status(200).json({ skipped: true })

  try {
    // Find matching operations by MMSI or IMO
    let query = `vessel_status=neq.Sailed&entry_status=neq.Closed`
    const headers = {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }

    // Try MMSI first
    let ops = []
    if (mmsi) {
      const r = await fetch(`${supabaseUrl}/rest/v1/operations?mmsi=eq.${mmsi}&${query}`, { headers })
      if (r.ok) ops = await r.json()
    }
    // Try IMO if no MMSI match
    if (ops.length === 0 && imo) {
      const r = await fetch(`${supabaseUrl}/rest/v1/operations?imo=eq.${imo}&${query}`, { headers })
      if (r.ok) ops = await r.json()
    }

    if (ops.length === 0) return res.status(200).json({ message: 'No matching operations found' })

    // Update each matching operation
    const updates = await Promise.all(ops.map(async op => {
      const updateBody = { vessel_status: newStatus }
      if (portName && event === 'Arrival') updateBody.port = portName

      const r = await fetch(`${supabaseUrl}/rest/v1/operations?id=eq.${op.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateBody),
      })

      // Add activity log entry
      await fetch(`${supabaseUrl}/rest/v1/operation_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operation_id: op.id,
          note: `🤖 Auto-updated via AIS: ${event} at ${portName || 'port'} — status changed to ${newStatus}`,
        }),
      })

      return { id: op.id, ref: op.ref, status: newStatus }
    }))

    console.log('Webhook updated:', updates)
    return res.status(200).json({ updated: updates })
  } catch(err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
