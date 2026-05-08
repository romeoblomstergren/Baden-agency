import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')

  const { imo, search, q } = req.query
  const searchQuery = search || q

  // GET VESSEL BY IMO (with caching)
  if (imo) {
    return await getVesselByIMO(imo, res)
  }
  
  // SEARCH VESSELS USING DEEPSEEK
  if (searchQuery) {
    return await searchVesselsWithDeepSeek(searchQuery, res)
  }

  return res.status(400).json({ error: 'Either imo or search parameter required' })
}

async function getVesselByIMO(imo, res) {
  try {
    // Check Supabase cache first
    const { data: cached } = await supabase
      .from('vessels')
      .select('*')
      .eq('imo', imo)
      .single()

    if (cached) {
      console.log(`✅ CACHE HIT for IMO ${imo}`)
      return res.status(200).json({ ...cached, fromCache: true })
    }

    // Call vesselAPI.com
    console.log(`💸 CACHE MISS for IMO ${imo} - calling vesselAPI.com`)
    
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
      result.name = v.name || ''
      result.mmsi = String(v.mmsi || '')
      result.flag = v.flag_state || v.flag || ''
      result.vessel_type = v.type || ''
      result.call_sign = v.call_sign || v.callsign || ''
      result.gt = v.gross_tonnage ? String(v.gross_tonnage) : ''
      result.dwt = v.deadweight ? String(v.deadweight) : ''
      result.loa = v.length ? String(v.length) : ''
      result.beam = v.breadth || v.width ? String(v.breadth || v.width) : ''
      result.year_built = v.year_built ? String(v.year_built) : ''
    }

    if (classRes.ok) {
      const data = await classRes.json()
      const c = data.classification || {}
      const id = c.identification || {}
      const dim = c.dimensions || {}
      if (!result.name) result.name = id.vesselName || ''
      if (!result.flag) result.flag = id.flagName || ''
      if (!result.vessel_type) result.vessel_type = id.typeFormatted || ''
      if (!result.gt && dim.grossTon69) result.gt = String(dim.grossTon69)
      if (!result.dwt && dim.dwt) result.dwt = String(dim.dwt)
      if (!result.loa && dim.lengthOverall) result.loa = String(dim.lengthOverall)
      if (!result.beam && dim.bm) result.beam = String(dim.bm)
    }

    // Cache to Supabase
    await supabase.from('vessels').upsert({
      imo, ...result, updated_at: new Date().toISOString()
    }, { onConflict: 'imo' })

    return res.status(200).json({ ...result, fromCache: false })
  } catch (e) {
    console.error('Vessel lookup error:', e)
    return res.status(500).json({ error: e.message })
  }
}

async function searchVesselsWithDeepSeek(query, res) {
  try {
    console.log(`🔍 DeepSeek search for: "${query}"`)

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a vessel identification assistant. Extract vessel information from user queries.
Return ONLY valid JSON in this format:
{
  "vessels": [
    {
      "name": "vessel name",
      "imo": "IMO number if mentioned or found (7 digits)",
      "confidence": "high/medium/low"
    }
  ]
}
If multiple vessels mentioned, list all. If no vessel found, return {"vessels": []}`
          },
          {
            role: 'user',
            content: `Find vessel(s) in this query: "${query}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    })

    if (!deepseekResponse.ok) {
      throw new Error('DeepSeek API failed')
    }

    const deepseekData = await deepseekResponse.json()
    const aiContent = deepseekData.choices[0].message.content
    const parsed = JSON.parse(aiContent)
    
    // For each vessel found, try to get full particulars
    const enrichedResults = []
    for (const vessel of parsed.vessels || []) {
      // Check if we already have this vessel in cache
      if (vessel.imo) {
        const { data: cached } = await supabase
          .from('vessels')
          .select('*')
          .eq('imo', vessel.imo)
          .single()
        
        if (cached) {
          enrichedResults.push({ ...cached, fromCache: true, confidence: vessel.confidence })
          continue
        }
        
        // Try to fetch from vesselAPI if we have IMO
        try {
          const fetchRes = await fetch(`http://localhost:3000/api/vessel?imo=${vessel.imo}`)
          if (fetchRes.ok) {
            const fullData = await fetchRes.json()
            enrichedResults.push({ ...fullData, confidence: vessel.confidence })
          } else {
            enrichedResults.push(vessel)
          }
        } catch {
          enrichedResults.push(vessel)
        }
      } else {
        // No IMO - just return name for manual lookup
        enrichedResults.push(vessel)
      }
    }

    return res.status(200).json({
      query,
      results: enrichedResults,
      source: 'deepseek'
    })

  } catch (error) {
    console.error('DeepSeek search error:', error)
    return res.status(500).json({ error: error.message })
  }
}
