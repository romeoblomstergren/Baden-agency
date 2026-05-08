import { useMonthlyStats } from '../hooks/useClients'
import { OP_TYPES, MONTHS } from '../lib/constants'

export default function Stats() {
  const { data, loading } = useMonthlyStats()

  if (loading) return <div className="page"><div className="spinner" /></div>

  // Build: op_type → year → month → count
  const nested = {}
  data.forEach(r => {
    if (!nested[r.op_type]) nested[r.op_type] = {}
    if (!nested[r.op_type][r.year]) nested[r.op_type][r.year] = {}
    nested[r.op_type][r.year][r.month] = r.count
  })

  return (
    <div className="page">
      <h1 style={{ marginBottom: 16 }}>Monthly Statistics</h1>

      {OP_TYPES.map(t => {
        const yearData = nested[t.code]
        if (!yearData) return null
        const years = Object.keys(yearData).sort()
        const color = {
          OPA:'#1B2A4A',BOC:'#2E5090',HUS:'#1A5E38',PAG:'#7B3F00',
          BRO:'#5C3566',TRA:'#B5510A',MAR:'#1A4A6B',ENQ:'#7F3F3F'
        }[t.code]

        return (
          <div key={t.code} className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              background: color, color: '#fff',
              padding: '10px 16px',
              fontWeight: 600, fontSize: '0.85rem',
            }}>
              {t.code} — {t.label}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    {MONTHS.map(m => <th key={m} style={{ textAlign:'center', minWidth: 36 }}>{m}</th>)}
                    <th style={{ textAlign:'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(year => {
                    const months = yearData[year]
                    const total = Object.values(months).reduce((a,b) => a+b, 0)
                    const maxVal = Math.max(...Object.values(months), 1)
                    const isCurrentYear = Number(year) === new Date().getFullYear()
                    return (
                      <tr key={year} style={{ background: isCurrentYear ? '#fffbeb' : undefined }}>
                        <td style={{ fontWeight: 600, color: isCurrentYear ? '#854F0B' : 'var(--text)' }}>
                          {year}{isCurrentYear ? ' ★' : ''}
                        </td>
                        {Array.from({length:12},(_,i)=>i+1).map(m => {
                          const val = months[m] || 0
                          const opacity = val ? 0.15 + (val/maxVal)*0.7 : 0
                          return (
                            <td key={m} style={{
                              textAlign: 'center',
                              background: val ? `rgba(27,42,74,${opacity})` : undefined,
                              color: val > 0 ? (opacity > 0.5 ? '#fff' : 'var(--navy)') : 'var(--border)',
                              fontWeight: val ? 600 : 400,
                              fontSize: '0.82rem',
                            }}>
                              {val || ''}
                            </td>
                          )
                        })}
                        <td style={{ textAlign:'right', fontWeight:700, color:'var(--navy)' }}>{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
