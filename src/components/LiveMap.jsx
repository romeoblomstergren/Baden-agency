import { useState } from 'react'
import { useActiveVessels } from '../hooks/useOperations'

export default function LiveMap() {
  const { data: active } = useActiveVessels()
  const [focused, setFocused] = useState(null) // null = overview, or operation object

  const vessels = active.filter(v => v.vessel_status !== 'Sailed')

  const buildUrl = (op) => {
    if (op && op.mmsi) {
      return `https://www.marinetraffic.com/en/ais/embed/zoom:10/centering:1/lat:14.5/lon:-17.5/default_vessels_population:1/mmsi:${op.mmsi}/lang:en`
    }
    if (op && op.imo) {
      return `https://www.marinetraffic.com/en/ais/embed/zoom:10/centering:1/lat:14.5/lon:-17.5/default_vessels_population:1/imo:${op.imo}/lang:en`
    }
    // Overview
    return `https://www.marinetraffic.com/en/ais/embed/zoom:5/centering:1/lat:14.5/lon:-17.5/default_vessels_population:1/lang:en`
  }

  const mapUrl = buildUrl(focused)

  const statusColor = {
    'Underway':  'var(--green)',
    'At Anchorage':   'var(--blue)',
    'Alongside': 'var(--amber)',
  }
  const statusBg = {
    'Underway':  'var(--green-bg)',
    'At Anchorage':   'var(--blue-bg)',
    'Alongside': 'var(--amber-bg)',
  }

  return (
    <div className="card" style={{ marginBottom: 28, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>🗺️ Live AIS — West Africa</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 10 }}>
            MarineTraffic
          </span>
        </div>
        <a href="https://www.marinetraffic.com" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--muted)', textDecoration: 'none' }}>
          Open full map ↗
        </a>
      </div>

      {/* Vessel selector buttons */}
      {vessels.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          background: 'var(--bg)',
        }}>
          <button
            onClick={() => setFocused(null)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: !focused ? 'var(--navy)' : 'var(--surface)',
              color: !focused ? '#fff' : 'var(--muted)',
              
            }}>
            🌍 Overview
          </button>
          {vessels.map(v => {
            const isFocused = focused?.id === v.id
            const hasTrack = !!(v.mmsi || v.imo)
            return (
              <button
                key={v.id}
                onClick={() => setFocused(isFocused ? null : v)}
                title={!hasTrack ? 'No MMSI/IMO — add one in Edit to enable tracking' : ''}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                  cursor: hasTrack ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  background: isFocused
                    ? (statusBg[v.vessel_status] || 'var(--gray-bg)')
                    : 'var(--surface)',
                  color: isFocused
                    ? (statusColor[v.vessel_status] || 'var(--muted)')
                    : hasTrack ? 'var(--text)' : 'var(--muted)',
                  border: isFocused
                    ? `1.5px solid ${statusColor[v.vessel_status] || 'var(--border)'}`
                    : '1px solid var(--border)',
                  opacity: hasTrack ? 1 : 0.5,
                }}>
                {v.vessel_status === 'Underway' ? '🟢' : v.vessel_status === 'At Anchorage' ? '🔵' : '🟡'} {v.vessel_name || '—'}
                {!hasTrack && ' ⚠️'}
              </button>
            )
          })}
        </div>
      )}

      {/* Focused vessel info bar */}
      {focused && (
        <div style={{
          padding: '8px 16px',
          background: statusBg[focused.vessel_status] || 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          fontSize: '0.82rem',
        }}>
          <span style={{ fontWeight: 700, color: statusColor[focused.vessel_status] }}>
            {focused.vessel_name}
          </span>
          {focused.port && <span style={{ color: 'var(--muted)' }}>📍 {focused.port}</span>}
          {focused.mmsi && <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: '0.75rem' }}>MMSI: {focused.mmsi}</span>}
          {focused.imo  && <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: '0.75rem' }}>IMO: {focused.imo}</span>}
          {focused.client_name && <span style={{ color: 'var(--muted)' }}>👤 {focused.client_name}</span>}
          <button onClick={() => setFocused(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
            ← Back to overview
          </button>
        </div>
      )}

      {/* Map */}
      <iframe
        key={mapUrl}
        src={mapUrl}
        title="Live AIS West Africa"
        style={{ width: '100%', height: 450, border: 'none', display: 'block' }}
        loading="lazy"
        allowFullScreen
      />
    </div>
  )
}
