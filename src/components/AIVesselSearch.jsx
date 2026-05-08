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
        setError('No vessels found. Try different search terms.')
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth: 600,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 24
        }} 
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>🤖 AI Vessel Search</h3>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchWithDeepSeek()}
            placeholder="e.g., 'container ship Maersk' or 'oil tanker IMO 1234567'"
            style={{ 
              flex: 1, 
              padding: '10px 12px', 
              borderRadius: 6, 
              border: '1px solid #ccc',
              fontSize: 14
            }}
          />
          <button 
            onClick={searchWithDeepSeek}
            disabled={searching}
            style={{
              padding: '10px 20px',
              background: searching ? '#94a3b8' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: searching ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {searching ? '🔍 Searching...' : '🤖 AI Search'}
          </button>
        </div>

        {error && (
          <div style={{ 
            color: '#dc2626', 
            padding: '10px 12px', 
            background: '#fee2e2', 
            borderRadius: 6, 
            marginBottom: 16,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>
              Found {results.length} vessel{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((vessel, idx) => (
              <div
                key={idx}
                onClick={() => onSelect(vessel)}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: '#f9fafb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.background = '#f3f4f6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.background = '#f9fafb'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {vessel.name || vessel.vessel_name || 'Unknown Vessel'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {vessel.imo && <span>IMO: {vessel.imo}</span>}
                  {vessel.mmsi && <span>MMSI: {vessel.mmsi}</span>}
                  {vessel.flag && <span>Flag: {vessel.flag}</span>}
                  {vessel.vessel_type && <span>Type: {vessel.vessel_type}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
