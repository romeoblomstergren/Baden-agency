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
    try {
      const res = await fetch(`/api/vessel?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.results && data.results.length) {
        setResults(data.results)
      } else {
        setError('No vessels found')
      }
    } catch (err) {
      setError('Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div style={{background:'white',borderRadius:12,maxWidth:600,width:'90%',padding:20}} onClick={e => e.stopPropagation()}>
        <h3 style={{marginTop:0}}>🤖 AI Vessel Search (DeepSeek)</h3>
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchWithDeepSeek()}
            placeholder="e.g., 'container ship Maersk' or 'oil tanker IMO 1234567'"
            style={{flex:1,padding:10,borderRadius:6,border:'1px solid #ccc'}}
          />
          <button
            onClick={searchWithDeepSeek}
            disabled={searching}
            style={{padding:'10px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}
          >
            {searching ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
        {error && <div style={{color:'#dc2626',marginBottom:20}}>{error}</div>}
        {results.map((vessel, idx) => (
          <div
            key={idx}
            onClick={() => onSelect(vessel)}
            style={{padding:12,marginBottom:8,background:'#f9fafb',borderRadius:8,cursor:'pointer',border:'1px solid #e5e7eb'}}
          >
            <div><strong>{vessel.name || vessel.vessel_name}</strong></div>
            <div style={{fontSize:'0.8rem',color:'#666'}}>
              {vessel.imo && `IMO: ${vessel.imo} `}
              {vessel.flag && `Flag: ${vessel.flag}`}
            </div>
          </div>
        ))}
        <button
          onClick={onClose}
            style={{marginTop:20,padding:'8px 16px',background:'#6b7280',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}
        >
          Close
        </button>
      </div>
    </div>
  )
}
