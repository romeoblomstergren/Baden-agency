import { useState, useEffect } from 'react'

export default function LivePosition({ mmsi, imo, inline = false }) {
  const [pos, setPos]     = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mmsi && !imo) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = mmsi ? `mmsi=${mmsi}` : `imo=${imo}`
        const r = await fetch(`/api/vessel-position?${params}`)
        if (r.ok && !cancelled) setPos(await r.json())
      } catch(e) {}
      if (!cancelled) setLoading(false)
    }
    load()
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [mmsi, imo])

  if (!mmsi && !imo) return null
  if (loading && !pos) return <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Loading position…</span>
  if (!pos) return null

  const speed = pos.speed != null ? Number(pos.speed).toFixed(1) + ' kn' : null
  const dest  = pos.destination || null
  const eta   = pos.eta ? new Date(pos.eta).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : null
  const lastPort = pos.last_port?.port_name

  if (inline) {
    return (
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {speed && <span>⚡ {speed}</span>}
        {dest && <span>→ {dest}</span>}
        {eta && <span>ETA {eta}</span>}
        {lastPort && <span>Last: {lastPort}</span>}
        <span style={{ color: 'var(--green)', fontSize: '0.68rem' }}>● Live</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(26,94,56,0.15)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--green)', fontWeight: 600 }}>● Live AIS</span>
        {speed && <span>{speed}</span>}
        {dest && <span>→ {dest}</span>}
        {eta && <span>ETA {eta}</span>}
        {lastPort && <span style={{ color: 'var(--muted)' }}>Last port: {lastPort}</span>}
        {pos.timestamp && <span style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>Updated {new Date(pos.timestamp).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</span>}
      </div>
    </div>
  )
}
