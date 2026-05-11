// src/hooks/useVesselWatch.js
// Call this whenever a vessel MMSI becomes known to auto-add to VesselAPI monitoring

export async function watchVessel(mmsi) {
  if (!mmsi) return
  try {
    await fetch('/api/vessel-watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mmsi: String(mmsi), action: 'add' }),
    })
  } catch(e) {
    console.error('Failed to watch vessel:', e)
  }
}

export async function unwatchVessel(mmsi) {
  if (!mmsi) return
  try {
    await fetch('/api/vessel-watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mmsi: String(mmsi), action: 'remove' }),
    })
  } catch(e) {
    console.error('Failed to unwatch vessel:', e)
  }
}
