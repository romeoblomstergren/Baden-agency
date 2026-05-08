import { useState, useRef, useEffect } from 'react'

async function lookupByIMO(imo) {
  try {
    const res = await fetch(`/api/vessel?imo=${imo}`)
    if (!res.ok) throw new Error('failed')
    return await res.json()
  } catch (e) {
    console.error('Vessel lookup error:', e)
    return null
  }
}

async function searchByName(q) {
  // VesselFinder name search via allorigins proxy
  try {
    const url = `https://www.vesselfinder.com/api/pub/portcalls/search?s=${encodeURIComponent(q)}`
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    return JSON.parse(data.contents || '[]').slice(0, 10)
  } catch {
    return []
  }
}

export default function VesselSearch({ value, onChange, onVesselSelect }) {
  const [query, setQuery]           = useState(value || '')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [open, setOpen]             = useState(false)
  const [imoResult, setImoResult]   = useState(null)
  const [imoError, setImoError]     = useState('')
  const [imoLoading, setImoLoading] = useState(false)
  const [manualImo, setManualImo]   = useState('')
  const timer = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setImoResult(null)
    setImoError('')
    clearTimeout(timer.current)

    if (/^\d{7}$/.test(val.trim())) {
      // IMO number — lookup via VesselAPI
      timer.current = setTimeout(async () => {
        setImoLoading(true)
        const vessel = await lookupByIMO(val.trim())
        if (vessel && vessel.name) {
          setImoResult(vessel)
        } else {
          setImoError('Vessel not found for this IMO.')
        }
        setImoLoading(false)
        setOpen(true)
      }, 500)
    } else if (val.length >= 3) {
      // Name search via VesselFinder
      timer.current = setTimeout(async () => {
        setSearching(true)
        const data = await searchByName(val)
        setResults(data)
        setSearching(false)
        setOpen(true)
      }, 400)
    }
    setOpen(true)
  }

  const applyVessel = (mapped) => {
    setQuery(mapped.name)
    onChange(mapped.name)
    onVesselSelect(mapped)
    setResults([])
    setImoResult(null)
    setOpen(false)
  }

  const applyManual = () => {
    onVesselSelect({ name: query, imo: manualImo, mmsi: '' })
    setOpen(false)
  }

  const isLoading = searching || imoLoading

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => (results.length > 0 || imoResult) && setOpen(true)}
          placeholder="Type vessel name or 7-digit IMO number…"
          autoComplete="off"
        />
        {isLoading && (
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
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 8, marginTop: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 300, maxHeight: 380, overflowY: 'auto',
        }}>

          {/* IMO result */}
          {imoResult && (
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 8,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vessel found via IMO lookup
              </div>
              <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(26,94,56,0.2)',
                borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
                  🚢 {imoResult.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px',
                  fontSize: '0.78rem', marginBottom: 10 }}>
                  {[['IMO', imoResult.imo], ['MMSI', imoResult.mmsi],
                    ['Flag', imoResult.flag], ['Type', imoResult.vessel_type],
                    ['Call Sign', imoResult.call_sign], ['GT', imoResult.gt],
                    ['DWT', imoResult.dwt], ['LOA', imoResult.loa ? imoResult.loa + ' m' : ''],
                    ['Beam', imoResult.beam ? imoResult.beam + ' m' : ''],
                    ['Year built', imoResult.year_built],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: 'var(--muted)' }}>{k}:</span>{' '}
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => applyVessel(imoResult)}
                  className="btn-primary btn-sm">✓ Apply to form</button>
              </div>
            </div>
          )}

          {/* IMO error */}
          {imoError && (
            <div style={{ padding: '12px 14px', color: 'var(--red)', fontSize: '0.82rem' }}>
              {imoError}
            </div>
          )}

          {/* Name search loading */}
          {searching && (
            <div style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center' }}>
              Searching… (may take a few seconds)
            </div>
          )}

          {/* Name results */}
          {!searching && results.length > 0 && (
            <>
              <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--muted)',
                borderBottom: '1px solid var(--border)' }}>
                {results.length} vessel{results.length !== 1 ? 's' : ''} found — click to auto-fill
              </div>
              {results.map((v, i) => (
                <div key={i} onClick={() => applyVessel({
                  name: v.name, imo: String(v.imo || ''), mmsi: String(v.mmsi || ''),
                  call_sign: v.callsign || '', flag: v.flag || '',
                  vessel_type: v.type || '', gt: '', dwt: '', loa: '', beam: '', year_built: '',
                })}
                  style={{ padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>🚢 {v.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2, fontFamily: 'var(--mono)' }}>
                    IMO: {v.imo || '—'} · MMSI: {v.mmsi || '—'}
                    {v.flag ? ` · ${v.flag}` : ''}
                    {v.type ? ` · ${v.type}` : ''}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* No results */}
          {!isLoading && !imoResult && !imoError && results.length === 0 && (
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 10 }}>
                No results. Enter IMO manually or continue with name only:
              </div>
              <input value={manualImo} onChange={e => setManualImo(e.target.value)}
                placeholder="IMO number (optional)"
                style={{ marginBottom: 8, fontFamily: 'var(--mono)' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={applyManual} className="btn-primary btn-sm">
                  ✓ Use "{query.slice(0, 22)}{query.length > 22 ? '…' : ''}"
                  {manualImo ? ` · IMO ${manualImo}` : ''}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
