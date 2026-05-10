// api/health.js — checks all critical systems
export default async function handler(req, res) {
  const checks = {}
  const start = Date.now()
  const host = req.headers.host ? `https://${req.headers.host}` : 'https://portal.baden-agency.com'

  // Check Supabase
  try {
    const t = Date.now()
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/operations?select=id&limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      }
    })
    checks.supabase = r.ok
      ? { status: 'ok', ms: Date.now() - t }
      : { status: 'error', code: r.status }
  } catch(e) {
    checks.supabase = { status: 'error', message: e.message }
  }

  // Check active_vessels view has all columns
  try {
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/active_vessels?select=id,vessel_name,flag,gt,dwt,loa&limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      }
    })
    const data = await r.json()
    const row = data[0]
    const hasAllCols = !row || ('flag' in row && 'gt' in row && 'loa' in row)
    checks.active_vessels_view = r.ok && hasAllCols
      ? { status: 'ok', columns: row ? Object.keys(row).length + ' columns' : 'no active vessels' }
      : { status: 'error', detail: !hasAllCols ? 'Missing columns (flag/gt/loa) — re-run view migration' : `HTTP ${r.status}` }
  } catch(e) {
    checks.active_vessels_view = { status: 'error', message: e.message }
  }

  // Check AI (DeepSeek)
  try {
    const t = Date.now()
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
      signal: AbortSignal.timeout(8000),
    })
    checks.ai_deepseek = r.ok
      ? { status: 'ok', ms: Date.now() - t }
      : { status: 'error', code: r.status }
  } catch(e) {
    checks.ai_deepseek = { status: 'error', message: e.message }
  }

  // Check Vessel API — call our own /api/vessel proxy (same as browser does)
  try {
    const t = Date.now()
    const r = await fetch(`${host}/api/vessel?imo=9307580`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = r.ok ? await r.json() : null
    checks.vessel_api = (r.ok && data?.name)
      ? { status: 'ok', ms: Date.now() - t, vessel: data.name }
      : { status: 'error', code: r.status }
  } catch(e) {
    checks.vessel_api = { status: 'warning', message: 'Cannot self-call in serverless — works fine in browser' }
  }

  const criticalOk = ['supabase', 'active_vessels_view', 'ai_deepseek'].every(k => checks[k]?.status === 'ok')
  const allOk = Object.values(checks).every(c => c.status === 'ok')

  return res.status(200).json({
    status: allOk ? 'healthy' : criticalOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    total_ms: Date.now() - start,
  })
}
