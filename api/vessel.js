import { createClient } from '@supabase/supabase-js'

// Initialize Supabase for backend caching
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY  // Use service role for backend operations
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { imo } = req.query
  if (!imo) return res.status(400).json({ error: 'IMO required' })

  try {
    // 1. 🟢 CHECK SUPABASE CACHE FIRST (FREE)
    const { data: cached, error: cacheError } = await supabase
      .from('vessels')
      .select('*')
      .eq('imo', imo)
      .single()

    if (cached && !cacheError) {
      console.log(`✅ CACHE HIT for IMO ${imo} - no API credit used`)
      return res.status(200).json({
        imo: cached.imo,
        name: cached.name,
        mmsi: cached.mmsi,
        call_sign: cached.call_sign,
        flag: cached.flag,
        vessel_type: cached.vessel_type,
        gt: cached.gt,
        dwt: cached.dwt,
        loa: cached.loa,
        beam: cached.beam,
        year_built: cached.year_built,
        fromCache: true
      })
    }

    // 2. 🔴 CACHE MISS - CALL EXTERNAL API (costs credit)
    console.log(`💸 CACHE MISS for IMO ${imo} - calling vesselAPI.com (costs credit)`)

    const [infoRes, classRes] = await Promise.all([
      fetch(`https://api.vesselapi.com/v1/vessel/${imo}?filter.idType=imo`, {
        headers: { 'Authorization': `Bearer ${process.env.VITE_VESSEL_API_KEY}` }
      }),
      fetch(`https://api.vesselapi.com/v1/vessel/${imo}/classification?filter.idType=imo`, {
        headers: { 'Authorization': `Bearer ${process.env.VITE_VESSEL_API_KEY}` }
      }),
    ])

    let result = { imo }

    if (infoRes.ok) {
      const data = await infoRes.json()
      const v = data.vessel || data
      result.name        = v.name        || ''
      result.mmsi        = String(v.mmsi || '')
      result.flag        = v.flag_state  || v.flag || ''
      result.vessel_type = v.type        || ''
      result.call_sign   = v.call_sign   || v.callsign || ''
      result.gt          = v.gross_tonnage ? String(v.gross_tonnage) : ''
      result.dwt         = v.deadweight    ? String(v.deadweight)    : ''
      result.loa         = v.length        ? String(v.length)        : ''
      result.beam        = v.breadth || v.width ? String(v.breadth || v.width) : ''
      result.year_built  = v.year_built    ? String(v.year_built)   : ''
    }

    if (classRes.ok) {
      const data = await classRes.json()
      const c   = data.classification || {}
      const id  = c.identification    || {}
      const dim = c.dimensions        || {}
      if (!result.name)        result.name        = id.vesselName    || ''
      if (!result.flag)        result.flag        = id.flagName      || ''
      if (!result.vessel_type) result.vessel_type = id.typeFormatted || ''
      if (!result.gt  && dim.grossTon69)    result.gt   = String(dim.grossTon69)
      if (!result.dwt && dim.dwt)           result.dwt  = String(dim.dwt)
      if (!result.loa && dim.lengthOverall) result.loa  = String(dim.lengthOverall)
      if (!result.beam && dim.bm)           result.beam = String(dim.bm)
    }

    // 3. 💾 SAVE TO SUPABASE CACHE (for future free lookups)
    const vesselToCache = {
      imo: imo,
      name: result.name,
      mmsi: result.mmsi,
      call_sign: result.call_sign,
      flag: result.flag,
      vessel_type: result.vessel_type,
      gt: result.gt,
      dwt: result.dwt,
      loa: result.loa,
      beam: result.beam,
      year_built: result.year_built,
      updated_at: new Date().toISOString()
    }

    const { error: upsertError } = await supabase
      .from('vessels')
      .upsert(vesselToCache, { onConflict: 'imo' })

    if (upsertError) {
      console.error('Failed to cache vessel:', upsertError)
    } else {
      console.log(`💾 CACHED IMO ${imo} - future searches will be free`)
    }

    res.status(200).json({
      ...result,
      fromCache: false
    })

  } catch (e) {
    console.error('Vessel lookup error:', e)
    res.status(500).json({ error: e.message })
  }
}
