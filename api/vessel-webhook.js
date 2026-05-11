// api/vessel-webhook.js
// VesselAPI webhook — fires when a vessel arrives or departs
// Webhook secret: badenagency2026
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify webhook signature
  const secret = process.env.VESSEL_WEBHOOK_SECRET || 'badenagency2026'
  const signature = req.headers['x-vessel-signature']
  // (signature verification can be added here if needed)

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).end() }
  }

  // VesselAPI sends: { eventType, vessel, port, timestamp }
  const eventType = body.eventType || body.event || ''
  const vessel    = body.vessel || {}
  const port      = body.port   || {}

  const mmsi = String(vessel.mmsi || '')
  const imo  = String(vessel.imo  || '')
  const portName = port.name || port.portName || ''

  // Map event type to vessel status
  let newStatus = null
  if (eventType === 'port.arrival'   || eventType === 'Arrival')   newStatus = 'Alongside'
  if (eventType === 'port.departure' || eventType === 'Departure')  newStatus = 'Underway'
  if (!newStatus) {
    console.log('Unhandled event type:', eventType)
    return res.status(200).json({ skipped: true, eventType })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const headers = {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  try {
    // Find matching active operations by MMSI or IMO
    let ops = []
    const baseFilter = 'entry_status=neq.Closed&vessel_status=neq.Sailed'

    if (mmsi) {
      const r = await fetch(`${supabaseUrl}/rest/v1/operations?mmsi=eq.${mmsi}&${baseFilter}`, { headers })
      if (r.ok) ops = await r.json()
    }
    if (ops.length === 0 && imo) {
      const r = await fetch(`${supabaseUrl}/rest/v1/operations?imo=eq.${imo}&${baseFilter}`, { headers })
      if (r.ok) ops = await r.json()
    }

    if (ops.length === 0) {
      console.log('No matching operations for', mmsi || imo)
      return res.status(200).json({ message: 'No matching operations' })
    }

    // Update each matching operation
    const updated = await Promise.all(ops.map(async op => {
      const patch = { vessel_status: newStatus }
      if (portName && newStatus === 'Alongside') patch.port = portName

      await fetch(`${supabaseUrl}/rest/v1/operations?id=eq.${op.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(patch),
      })

      // Add activity log
      await fetch(`${supabaseUrl}/rest/v1/operation_logs`, {
        method: 'POST', headers,
        body: JSON.stringify({
          operation_id: op.id,
          note: `🤖 AIS auto-update: ${eventType === 'port.arrival' ? 'Arrived' : 'Departed'} ${portName || 'port'} → status: ${newStatus}`,
        }),
      })

      return { id: op.id, ref: op.ref, newStatus }
    }))

    console.log('Webhook updated:', updated)
    return res.status(200).json({ updated })

  } catch(err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
