import { useState } from 'react'
import { useOperations } from '../hooks/useOperations'
import { VesselStatusBadge, EntryStatusBadge, OpTypeBadge } from '../components/StatusBadge'
import EditPanel from '../components/EditPanel'
import { formatDate, formatMoney, OP_TYPES, CURRENT_YEAR } from '../lib/constants'

const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i)

export default function Register() {
  const [filters, setFilters]   = useState({ limit: 100 })
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const { data, loading, refetch } = useOperations({ ...filters, search: search||undefined })

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v||undefined }))

  return (
    <div className="page">
      <div className="page-header">
        <h1>Register</h1>
        <span style={{ color:'var(--muted)', fontSize:'0.82rem' }}>
          {loading ? '…' : data.length} entries
        </span>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:14, marginBottom:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          <input placeholder="Search vessel, port, client, ref…"
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{ gridColumn:'1/-1' }} />
          <select onChange={e=>set('op_type',e.target.value)} defaultValue="">
            <option value="">All op types</option>
            {OP_TYPES.map(t=><option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
          </select>
          <select onChange={e=>set('year',e.target.value?Number(e.target.value):undefined)} defaultValue="">
            <option value="">All years</option>
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select onChange={e=>set('entry_status',e.target.value)} defaultValue="">
            <option value="">All statuses</option>
            {['Open','Closed','Pending','Disputed','Partial','Cancelled'].map(s=>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {/* Mobile cards */}
          <div className="mobile-cards">
            {data.map(op => (
              <div key={op.id} className="card" style={{ padding:'12px 14px', marginBottom:10, cursor:'pointer' }}
                onClick={() => setSelected(op)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div>
                    <OpTypeBadge code={op.op_type} />
                    <span className="ref" style={{ marginLeft:8 }}>{op.ref}</span>
                  </div>
                  <EntryStatusBadge status={op.entry_status} />
                </div>
                <div style={{ fontWeight:600, marginBottom:2 }}>{op.vessel_name||'—'}</div>
                <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:4 }}>
                  {op.port} · {op.client_name}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'var(--muted)', fontSize:'0.78rem' }}>{formatDate(op.op_date)}</span>
                  {op.vessel_status && <VesselStatusBadge status={op.vessel_status} />}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card desktop-table">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th><th>Vessel</th><th>Port</th><th>Account</th>
                    <th>Date</th><th>Invoice out</th><th>Net</th>
                    <th>Status</th><th>Vessel</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length===0 ? (
                    <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>No results</td></tr>
                  ) : data.map(op=>(
                    <tr key={op.id} onClick={()=>setSelected(op)}
                      style={{ cursor:'pointer' }}>
                      <td>
                        <OpTypeBadge code={op.op_type} />
                        <span className="ref" style={{ marginLeft:8 }}>{op.ref}</span>
                      </td>
                      <td style={{ fontWeight:500 }}>{op.vessel_name||'—'}</td>
                      <td style={{ color:'var(--muted)' }}>{op.port||'—'}</td>
                      <td>{op.client_name||'—'}</td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(op.op_date)}</td>
                      <td>{formatMoney(op.inv_out,op.inv_currency)}</td>
                      <td style={{ color:op.net>0?'var(--green)':'var(--muted)' }}>
                        {formatMoney(op.net,op.inv_currency)}
                      </td>
                      <td><EntryStatusBadge status={op.entry_status} /></td>
                      <td><VesselStatusBadge status={op.vessel_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <style>{`
            @media (min-width: 700px) { .mobile-cards { display: none; } }
            @media (max-width: 699px) { .desktop-table { display: none; } }
            tbody tr:hover { background: #f0f4ff !important; }
          `}</style>
        </>
      )}

      {/* Edit panel */}
      <EditPanel
        operation={selected}
        onClose={() => setSelected(null)}
        onSaved={refetch}
      />
    </div>
  )
}
