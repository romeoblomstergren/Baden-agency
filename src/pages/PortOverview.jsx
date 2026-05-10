import { useState } from 'react'

const SOURCE_COLORS = {
  'AISHub (live AIS)': { bg: 'var(--green-bg)', color: 'var(--green)', label: '🟢 Live AIS' },
  'VesselFinder':      { bg: 'var(--blue-bg)',  color: 'var(--blue)',  label: '🔵 VesselFinder' },
}

const STATUS_STYLE = {
  'Expected':  { bg: '#f3f4f6', color: '#6b7280' },
  'Alongside': { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  'In Port':   { bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  'Underway':  { bg: 'var(--green-bg)', color: 'var(--green)' },
}

const KNOWN_PORTS = [
  'Tema', 'Abidjan', 'Dakar', 'Conakry', 'Freetown', 'Monrovia',
  'Cotonou', 'Lagos', 'Douala', 'Libreville', 'Matadi', 'Bata',
  'Nouakchott', 'Rotterdam', 'Antwerp', 'Hamburg', 'Singapore',
]

export default function PortOverview() {
  const [port, setPort]       = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  async function search(portName) {
    const target = portName ?? port.trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/port-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: target, country: country.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error && !data.vessels?.length) throw new Error(data.error)
      setResult(data)
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const sourceStyle = result?.source
    ? (Object.entries(SOURCE_COLORS).find(([k]) => result.source.startsWith(k))?.[1] ?? { bg: 'var(--amber-bg)', color: 'var(--amber)', label: '🟡 ' + result.source })
    : null

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1>Port Lineup</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            Live vessel arrivals & expected calls at any port worldwide
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={port}
            onChange={e => setPort(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Port name e.g. Tema, Rotterdam, Singapore…"
            style={{ flex: 2, minWidth: 200 }}
            list="port-suggestions"
          />
          <datalist id="port-suggestions">
            {KNOWN_PORTS.map(p => <option key={p} value={p} />)}
          </datalist>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Country (optional)"
            style={{ flex: 1, minWidth: 120 }}
          />
          <button
            onClick={() => search()}
            disabled={!port.trim() || loading}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? '◌ Searching…' : '🔍 Search port'}
          </button>
        </div>

        {/* Quick port buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {KNOWN_PORTS.slice(0, 8).map(p => (
            <button key={p}
              onClick={() => { setPort(p); search(p) }}
              disabled={loading}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>📍 {result.port}{result.country ? `, ${result.country}` : ''}</h2>
            {sourceStyle && (
              <span style={{ background: sourceStyle.bg, color: sourceStyle.color, fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                {sourceStyle.label}
              </span>
            )}
            {result.source?.includes('AI estimate') && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                Based on AI knowledge — verify with port authority
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
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vessel</th>
                      <th>IMO</th>
                      <th>Flag</th>
                      <th>Type</th>
                      <th>Cargo</th>
                      <th>ETA</th>
                      <th>Status</th>
                      <th>Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.vessels.map((v, i) => {
                      const ss = STATUS_STYLE[v.status] || STATUS_STYLE['Expected']
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{v.name}</td>
                          <td><span className="ref">{v.imo || '—'}</span></td>
                          <td style={{ color: 'var(--muted)' }}>{v.flag || '—'}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{v.vessel_type || '—'}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.cargo || '—'}</td>
                          <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{v.eta || '—'}</td>
                          <td>
                            {v.status ? (
                              <span style={{ background: ss.bg, color: ss.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                {v.status}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{v.speed || '—'}</td>
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
