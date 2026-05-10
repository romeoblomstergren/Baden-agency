// api/health.js — checks all critical systems
export default async function handler(req, res) {
  const checks = {}
  const start = Date.now()

  // Check Supabase
  try {
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/operations?select=id&limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      }
    })
    checks.supabase = r.ok ? { status: 'ok', ms: Date.now() - start } : { status: 'error', code: r.status }
  } catch(e) {
    checks.supabase = { status: 'error', message: e.message }
  }

  // Check active_vessels view
  try {
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/active_vessels?select=id,vessel_name,flag,gt&limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      }
    })
    const data = await r.json()
    const hasAllCols = data[0] ? 'flag' in data[0] && 'gt' in data[0] : true
    checks.active_vessels_view = r.ok && hasAllCols
      ? { status: 'ok', columns: Object.keys(data[0] || {}) }
      : { status: 'error', detail: hasAllCols ? `HTTP ${r.status}` : 'Missing columns (flag/gt) — run view migration' }
  } catch(e) {
    checks.active_vessels_view = { status: 'error', message: e.message }
  }

  // Check AI (DeepSeek)
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
      signal: AbortSignal.timeout(8000),
    })
    checks.ai_deepseek = r.ok ? { status: 'ok' } : { status: 'error', code: r.status }
  } catch(e) {
    checks.ai_deepseek = { status: 'error', message: e.message }
  }

  // Check VesselAPI
  try {
    const r = await fetch(`https://api.vessel-api.com/vessels?imo=9307580&token=${process.env.VITE_VESSEL_API_KEY}`, {
      signal: AbortSignal.timeout(5000),
    })
    checks.vessel_api = r.ok ? { status: 'ok' } : { status: 'error', code: r.status }
  } catch(e) {
    checks.vessel_api = { status: 'error', message: e.message }
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok')
  return res.status(allOk ? 200 : 207).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    total_ms: Date.now() - start,
  })
}
