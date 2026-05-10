import { useState, useEffect } from 'react'

function Check({ name, result }) {
  const ok      = result?.status === 'ok'
  const warning = result?.status === 'warning'
  const loading = !result
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8,
      borderLeft: '4px solid ' + (loading ? 'var(--muted)' : ok ? 'var(--green)' : warning ? 'var(--amber)' : 'var(--red)'),
    }}>
      <div style={{ fontSize: '1.2rem' }}>
        {loading ? '⏳' : ok ? '✅' : warning ? '⚠️' : '❌'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{name}</div>
        {result && (
          <div style={{ fontSize: '0.75rem', color: ok ? 'var(--green)' : warning ? 'var(--amber)' : 'var(--red)', marginTop: 2 }}>
            {ok
              ? (result.ms ? result.ms + 'ms' : result.columns ? result.columns : result.vessel ? result.vessel : 'Connected')
              : (result.detail || result.message || (result.code ? 'HTTP ' + result.code : 'Failed'))}
          </div>
        )}
        {loading && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>Checking…</div>}
      </div>
    </div>
  )
}

export default function Health() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState(null)

  async function runChecks() {
    setLoading(true); setData(null)
    try {
      const r = await fetch('/api/health')
      const d = await r.json()
      setData(d)
      setLastRun(new Date())
    } catch(e) {
      setData({ status: 'error', checks: {}, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runChecks() }, [])

  const allOk = data?.status === 'healthy'

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <h1>System Health</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            {lastRun ? 'Last checked: ' + lastRun.toLocaleTimeString('en-GB') : 'Checking systems…'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data && (
            <span style={{
              background: allOk ? 'var(--green-bg)' : 'var(--amber-bg)',
              color: allOk ? 'var(--green)' : 'var(--amber)',
              fontWeight: 700, fontSize: '0.82rem',
              padding: '6px 14px', borderRadius: 20,
            }}>
              {allOk ? '✅ All systems OK' : '⚠️ Check results below'}
            </span>
          )}
          <button onClick={runChecks} disabled={loading} className="btn-secondary btn-sm">
            {loading ? '◌ Checking…' : '↻ Recheck'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Check name="Supabase Database"        result={data?.checks?.supabase} />
        <Check name="active_vessels View"      result={data?.checks?.active_vessels_view} />
        <Check name="AI Assistant (DeepSeek)"  result={data?.checks?.ai_deepseek} />
        <Check name="Vessel API"               result={data?.checks?.vessel_api} />
      </div>

      {data?.total_ms && (
        <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right' }}>
          Total check time: {data.total_ms}ms
        </div>
      )}
    </div>
  )
}
