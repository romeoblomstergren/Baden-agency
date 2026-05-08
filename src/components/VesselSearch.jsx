import { useState, useRef, useEffect } from 'react'

// Uses VesselFinder public search API (no key needed for basic name search)
// Falls back to showing manual IMO entry if API unavailable
export default function VesselSearch({ value, onChange, onVesselSelect }) {
  const [query, setQuery]         = useState(value || '')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen]           = useState(false)
  const [manualImo, setManualImo] = useState('')
  const timer = useRef(null)
  const wrapRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q) => {
    if (q.length < 3) { setResults([]); return }
    setSearching(true)
    try {
      // VesselFinder autocomplete API - free, no key needed
      const res = await fetch(
        `https://www.vesselfinder.com/api/pub/portcalls/search?s=${encodeURIComponent(q)}`
      )
      if (!res.ok) throw new Error('API unavailable')
      const data = await res.json()
      // data is array of {name, imo, mmsi, type, flag}
      setResults((data || []).slice(0, 8))
      setOpen(true)
    } catch {
      // API blocked by CORS in browser - show manual entry fallback
      setResults([])
      setOpen(true)
    } finally {
      setSearching(false)
    }
  }

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(val), 400)
    setOpen(true)
  }

  const select = (vessel) => {
    const name = `${vessel.type === 'Tanker' ? 'MT' : 'MV'} ${vessel.name}`
    setQuery(name)
    onChange(name)
    onVesselSelect({ name, imo: vessel.imo, mmsi: vessel.mmsi })
    setResults([])
    setOpen(false)
  }

  const applyManual = () => {
    onVesselSelect({ name: query, imo: manualImo, mmsi: '' })
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 3 && setOpen(true)}
          placeholder="Type vessel name to search…"
          autoComplete="off"
        />
        {searching && (
          <div style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, border: '2px solid var(--border)',
            borderTopColor: 'var(--navy)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {open && query.length >= 3 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 8, marginTop: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 300,
          maxHeight: 300, overflowY: 'auto',
        }}>
          {results.length > 0 ? (
            <>
              <div style={{ padding:'8px 12px', fontSize:'0.72rem', color:'var(--muted)',
                            borderBottom:'1px solid var(--border)' }}>
                Select vessel to auto-fill IMO/MMSI
              </div>
              {results.map((v, i) => (
                <div key={i} onClick={() => select(v)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    🚢 {v.name}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2,
                                fontFamily: 'var(--mono)' }}>
                    IMO: {v.imo || '—'} · MMSI: {v.mmsi || '—'}
                    {v.flag ? ` · ${v.flag}` : ''}
                    {v.type  ? ` · ${v.type}` : ''}
                  </div>
                </div>
              ))}
            </>
          ) : !searching ? (
            // Fallback: manual IMO entry
            <div style={{ padding: 14 }}>
              <div style={{ fontSize:'0.82rem', color:'var(--muted)', marginBottom:10 }}>
                No results from live search. Enter IMO manually or continue with vessel name only:
              </div>
              <input
                value={manualImo}
                onChange={e => setManualImo(e.target.value)}
                placeholder="IMO number (optional)"
                style={{ marginBottom: 8, fontFamily:'var(--mono)' }}
              />
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={applyManual} className="btn-primary btn-sm">
                  Use "{query.slice(0,20)}{query.length>20?'…':''}"
                  {manualImo ? ` · IMO ${manualImo}` : ''}
                </button>
                <button onClick={() => setOpen(false)} className="btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
