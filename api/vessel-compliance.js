// api/vessel-compliance.js
// Fetches EU MRV emissions and PSC inspection data from VesselAPI
// GET /api/vessel-compliance?id=257801000&idType=mmsi
export default async function handler(req, res) {
  const { id, idType = 'mmsi' } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })

  const apiKey = process.env.VESSEL_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VESSEL_API_KEY not configured' })

  const headers = { 'Authorization': 'Bearer ' + apiKey }
  const base = `https://api.vesselapi.com/v1/vessel/${id}`
  const params = `filter.idType=${idType}`

  const [emissionsRes, inspectionsRes] = await Promise.allSettled([
    fetch(`${base}/emissions?${params}`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}/inspections?${params}`, { headers, signal: AbortSignal.timeout(8000) }),
  ])

  const emissions = emissionsRes.status === 'fulfilled' && emissionsRes.value.ok
    ? (await emissionsRes.value.json()).emissions || []
    : []

  const inspectionsData = inspectionsRes.status === 'fulfilled' && inspectionsRes.value.ok
    ? await inspectionsRes.value.json()
    : {}

  return res.status(200).json({
    emissions,
    inspections: inspectionsData.inspections || [],
    inspection_count: inspectionsData.inspection_count || 0,
  })
}
