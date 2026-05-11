// api/vessel-watch.js
// Automatically manages which vessels are watched in VesselAPI notifications
// Called whenever a new operation is created or vessel particulars are updated

const NOTIFICATION_ID = 'd4d31524-3aab-432e-9a4a-3afe9de3c091'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }

  const { mmsi, action = 'add' } = body ?? {}
  if (!mmsi) return res.status(400).json({ error: 'mmsi required' })

  const apiKey = process.env.VESSEL_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VESSEL_API_KEY not configured' })

  try {
    // Get current notification to see existing MMSIs
    const getRes = await fetch(`https://api.vesselapi.com/v1/notifications/${NOTIFICATION_ID}`, {
      headers: { 'Authorization': 'Bearer ' + apiKey },
    })
    if (!getRes.ok) return res.status(getRes.status).json({ error: 'Could not fetch notification' })

    const { notification } = await getRes.json()
    const currentMmsis = notification.mmsis || []
    const mmsiNum = Number(mmsi)

    let newMmsis
    if (action === 'add') {
      if (currentMmsis.includes(mmsiNum)) {
        return res.status(200).json({ message: 'Already watching', mmsi: mmsiNum })
      }
      newMmsis = [...currentMmsis, mmsiNum]
    } else {
      newMmsis = currentMmsis.filter(m => m !== mmsiNum)
    }

    // Update notification with new MMSI list
    const patchRes = await fetch(`https://api.vesselapi.com/v1/notifications/${NOTIFICATION_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mmsis: newMmsis }),
    })

    if (!patchRes.ok) {
      const err = await patchRes.json()
      return res.status(patchRes.status).json({ error: err?.error?.message ?? 'Failed to update' })
    }

    console.log(`Vessel ${action}ed to watch: MMSI ${mmsiNum} (total: ${newMmsis.length})`)
    return res.status(200).json({ success: true, action, mmsi: mmsiNum, total_watched: newMmsis.length })

  } catch(err) {
    console.error('vessel-watch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
