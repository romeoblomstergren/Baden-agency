import { useState } from 'react'
import { PORT_LOCODES } from '../lib/portLocodes'

const SOURCE_STYLES = {
  'VesselAPI (live AIS)': { bg: 'var(--green-bg)', color: 'var(--green)', label: '🟢 Live AIS' },
}

const STATUS_STYLE = {
  'Expected':    { bg: '#f3f4f6',          color: '#6b7280' },
  'Alongside':   { bg: 'var(--amber-bg)',  color: 'var(--amber)' },
  'At Anchorage':{ bg: 'var(--blue-bg)',   color: 'var(--blue)'  },
  'Underway':    { bg: 'var(--green-bg)',  color: 'var(--green)' },
}

export default function PortOverview() {
  const [portInput, setPortInput] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')

  async function search(portName, locode) {
    const target = portName ?? portInput.trim()
    if (!target) return

    // Find locode from known ports if not provided
    const knownPort = PORT_LOCODES.find(p =>
      p.name.toLowerCase() === target.toLowerCase() ||
      p.locode === target.toUpperCase()
    )
    const resolvedLocode = locode || knownPort?.locode || null
    const resolvedCountry = knownPort?.country || null

    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/port-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: target,
          country: resolvedCountry,
          locode: resolvedLocode,
        }),
      })
      const data = await res.json()
      if (data.error && !data.vessels?.length) throw new Error(data.error)
      setResult({ ...data, locode: resolvedLocode })
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isLive = result?.source?.includes('VesselAPI')
  const sourceStyle = isLive
    ? SOURCE_STYLES['VesselAPI (live AIS)']
    : { bg: 'var(--amber-bg)', color: 'var(--amber)', label: '🟡 AI estimate' }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div>
          <h1>Port Lineup</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            Live AIS vessel arrivals & port calls worldwide
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={portInput}
            onChange={e => setPortInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Port name or UN/LOCODE (e.g. Tema, GHTMA)…"
            style={{ flex: 1, minWidth: 200 }}
            list="port-suggestions"
          />
          <datalist id="port-suggestions">
            {PORT_LOCODES.map(p => <option key={p.locode} value={p.name}>{p.name}, {p.country} ({p.locode})</option>)}
          </datalist>
          <button onClick={() => search()} disabled={!portInput.trim() || loading} className="btn-primary">
            {loading ? '◌ Loading…' : '🔍 Search'}
          </button>
        </div>

        {/* Quick port buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {PORT_LOCODES.slice(0, 10).map(p => (
            <button key={p.locode}
              onClick={() => { setPortInput(p.name); search(p.name, p.locode) }}
              disabled={loading}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--navy)'; e.currentTarget.style.color='var(--navy)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--muted)' }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>📍 {result.port}{result.locode ? ` (${result.locode})` : ''}</h2>
            <span style={{ background: sourceStyle.bg, color: sourceStyle.color, fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
              {sourceStyle.label}
            </span>
            {!isLive && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                Add UN/LOCODE for live AIS data
              </span>
            )}
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 'auto' }}>
              {result.vessels.length} vessel{result.vessels.length !== 1 ? 's' : ''}
            </span>
          </div>

          {result.vessels.length === 0 ? (
            <div className="card empty">
              <div className="empty-icon">⚓</div>
              <p>No vessels found for this port.</p>
              {!result.locode && <p style={{ fontSize: '0.8rem', marginTop: 8 }}>Try searching by UN/LOCODE for live AIS data (e.g. GHTMA for Tema)</p>}
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vessel</th>
                      <th>IMO</th>
                      <th>MMSI</th>
                      <th>Flag</th>
                      <th>Type</th>
                      <th>ETA / Time</th>
                      <th>Status</th>
                      <th>Cargo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.vessels.map((v, i) => {
                      const ss = STATUS_STYLE[v.status] || STATUS_STYLE['Expected']
                      const etaStr = v.eta ? new Date(v.eta).toLocaleDateString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{v.name}</td>
                          <td><span className="ref">{v.imo || '—'}</span></td>
                          <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{v.mmsi || '—'}</td>
                          <td style={{ color: 'var(--muted)' }}>{v.flag || '—'}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{v.vessel_type || '—'}</td>
                          <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{etaStr}</td>
                          <td>
                            {v.status ? <span style={{ background: ss.bg, color: ss.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{v.status}</span> : '—'}
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.cargo || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
