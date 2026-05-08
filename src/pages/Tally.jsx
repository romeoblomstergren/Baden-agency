import { useState } from 'react'
import { useClientTally } from '../hooks/useClients'
import { OP_TYPES } from '../lib/constants'

export default function Tally() {
  const { data, loading } = useClientTally()
  const [search, setSearch] = useState('')

  const filtered = data.filter(r =>
    !search || r.client.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Client Tally</h1>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{data.length} clients</span>
      </div>

      <input
        placeholder="Search client…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {/* Mobile: cards */}
      <div className="mobile-cards">
        {filtered.map(row => (
          <div key={row.client} className="card" style={{ padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>{row.client}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {OP_TYPES.map(t => {
                const count = row[t.code.toLowerCase()]
                if (!count) return null
                return (
                  <div key={t.code} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg)', padding: '4px 10px', borderRadius: 6,
                    fontSize: '0.82rem',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>{t.code}</span>
                    <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--muted)' }}>Total appointments</span>
              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.total}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="card desktop-table">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                {OP_TYPES.map(t => <th key={t.code}>{t.code}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>No results</td></tr>
              ) : filtered.map(row => (
                <tr key={row.client}>
                  <td style={{ fontWeight: 500 }}>{row.client}</td>
                  {OP_TYPES.map(t => (
                    <td key={t.code} style={{
                      textAlign: 'center',
                      fontWeight: row[t.code.toLowerCase()] ? 600 : 400,
                      color: row[t.code.toLowerCase()] ? 'var(--navy)' : 'var(--border)',
                    }}>
                      {row[t.code.toLowerCase()] || '—'}
                    </td>
                  ))}
                  <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (min-width: 700px) { .mobile-cards { display: none; } }
        @media (max-width: 699px) { .desktop-table { display: none; } }
      `}</style>
    </div>
  )
}
