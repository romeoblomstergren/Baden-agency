import { useState } from 'react'

export default function AIVesselSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  const searchWithDeepSeek = async () => {
    if (!query.trim()) return
    
    setSearching(true)
    setError('')
    setResults([])
    
    try {
      const response = await fetch(`/api/vessel?search=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setError('No vessels found. Try different search terms or IMO number.')
      }
    } catch (err) {
      setError('Search failed. Please try again.')
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (vessel) => {
    onSelect(vessel)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        maxWidth: 600,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: 20
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>🤖 AI Vessel Search (DeepSeek)</h3>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchWithDeepSeek()}
            placeholder="e.g., 'Maersk container ship' or 'oil tanker IMO 1234567'"
            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
          />
          <button 
            onClick={searchWithDeepSeek}
            disabled={searching}
            className="btn-primary"
          >
            {searching ? '🤖 Thinking...' : '🔍 AI Search'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', padding: 10, background: 'var(--surface)', borderRadius: 6, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
              Found {results.length} vessel{results.length > 1 ? 's' : ''}
            </div>
            {results.map((vessel, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(vessel)}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: 'var(--surface)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {vessel.name || vessel.vessel_name}
                  {vessel.confidence && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      marginLeft: 8, 
                      color: vessel.confidence === 'high' ? 'var(--green)' : 'var(--orange)'
                    }}>
                      ({vessel.confidence} confidence)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {vessel.imo && <span>IMO: {vessel.imo}</span>}
                  {vessel.mmsi && <span>MMSI: {vessel.mmsi}</span>}
                  {vessel.flag && <span>Flag: {vessel.flag}</span>}
                  {vessel.vessel_type && <span>Type: {vessel.vessel_type}</span>}
                  {vessel.fromCache && <span>📦 From cache</span>}
                </div>
                {(vessel.gt || vessel.dwt || vessel.loa) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
                    {vessel.gt && `${vessel.gt} GT`} 
                    {vessel.dwt && ` / ${vessel.dwt} DWT`}
                    {vessel.loa && ` / LOA ${vessel.loa}m`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
