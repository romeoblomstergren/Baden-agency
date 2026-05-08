import { useState, useRef } from 'react'
import { useOperations, updateOperation } from '../hooks/useOperations'
import { useClients } from '../hooks/useClients'
import { formatDate, formatMoney } from '../lib/constants'

function EditableAmount({ value, currency, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  const commit = async () => {
    const num = val === '' ? null : Number(val)
    await onSave(num)
    setEditing(false)
  }

  if (editing) return (
    <input
      type="number" step="0.01"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      autoFocus
      style={{
        width: 100, textAlign: 'right',
        fontFamily: 'var(--mono)', fontSize: '0.82rem',
        padding: '3px 6px', border: '1.5px solid var(--navy2)',
        borderRadius: 4,
      }}
    />
  )

  return (
    <span
      onClick={() => { setVal(value || ''); setEditing(true) }}
      title="Click to edit"
      style={{
        cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.82rem',
        padding: '2px 6px', borderRadius: 4,
        border: '1.5px dashed transparent',
        transition: 'border-color 0.15s',
        display: 'inline-block',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      {value ? formatMoney(value, currency) : <span style={{ color: 'var(--border)' }}>click to add</span>}
    </span>
  )
}

export default function SOA() {
  const { clients } = useClients()
  const [mode, setMode]             = useState('client')
  const [clientName, setClientName] = useState('')
  const [subAgent, setSubAgent]     = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [localData, setLocalData]   = useState({}) // track local edits
  const printRef = useRef()

  const isClient   = mode === 'client'
  const searchName = isClient ? clientName : subAgent

  const { data, loading, refetch } = useOperations({
    ...(isClient ? { client_name: clientName || undefined } : {}),
    limit: 2000,
  })

  const rows = data.filter(r => {
    if (!isClient && subAgent) {
      if (!r.sub_agent || !r.sub_agent.toLowerCase().includes(subAgent.toLowerCase())) return false
    }
    if (!r.op_date) return true
    if (dateFrom && r.op_date < dateFrom) return false
    if (dateTo   && r.op_date > dateTo)   return false
    return true
  }).map(r => ({ ...r, ...(localData[r.id] || {}) }))

  const totalOut = rows.reduce((s, r) => s + (r.inv_out || 0), 0)
  const totalIn  = rows.reduce((s, r) => s + (r.inv_in  || 0), 0)
  const totalNet = rows.reduce((s, r) => s + ((r.inv_out || 0) - (r.inv_in || 0)), 0)

  const saveField = async (id, field, value) => {
    // Optimistic local update
    setLocalData(prev => {
      const existing = prev[id] || {}
      const updated = { ...existing, [field]: value }
      // Recalculate net
      const row = rows.find(r => r.id === id) || {}
      const inv_out = field === 'inv_out' ? value : (existing.inv_out ?? row.inv_out ?? 0)
      const inv_in  = field === 'inv_in'  ? value : (existing.inv_in  ?? row.inv_in  ?? 0)
      updated.net = (inv_out || 0) - (inv_in || 0)
      return { ...prev, [id]: updated }
    })
    await updateOperation(id, { [field]: value })
  }

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML
    const w = window.open('', '_blank')
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SOA — ${searchName || 'Statement'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Sora', sans-serif; font-size: 12px; color: #111827; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #1B2A4A; padding-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead th { background: #1B2A4A; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          thead th.right { text-align: right; }
          tbody td { padding: 8px 10px; border-bottom: 1px solid #E2E6ED; }
          tbody tr:nth-child(even) { background: #F9FAFB; }
          .mono { font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
          .right { text-align: right; }
          .total-row td { background: #1B2A4A; color: #fff; font-weight: 700; padding: 10px; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E6ED; color: #6B7280; font-size: 10px; display: flex; justify-content: space-between; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `)
    w.document.close()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const subAgents = [...new Set(data.map(r => r.sub_agent).filter(Boolean))].sort()

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-header">
        <h1>Statement of Account</h1>
        {searchName && rows.length > 0 && (
          <button onClick={handlePrint} className="btn-primary btn-sm">⬇ Export PDF</button>
        )}
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', marginBottom: 20, background: 'var(--bg)', borderRadius: 8, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['client', '👤 Client / Principal'], ['subagent', '🤝 Sub-Agent']].map(([val, label]) => (
          <button key={val} onClick={() => { setMode(val); setClientName(''); setSubAgent(''); setLocalData({}) }}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500,
              background: mode === val ? 'var(--navy)' : 'transparent',
              color: mode === val ? '#fff' : 'var(--muted)',
              transition: 'all 0.15s',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">{isClient ? 'Client / Principal *' : 'Sub-Agent *'}</label>
            <input
              value={isClient ? clientName : subAgent}
              onChange={e => isClient ? setClientName(e.target.value) : setSubAgent(e.target.value)}
              list={isClient ? 'soa-clients' : 'soa-subagents'}
              placeholder={isClient ? 'Start typing client name…' : 'Start typing sub-agent name…'}
            />
            <datalist id="soa-clients">
              {clients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            <datalist id="soa-subagents">
              {subAgents.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Date from</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Date to</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {!searchName ? (
        <div className="card empty">
          <div className="empty-icon">📄</div>
          <p>Enter a {isClient ? 'client' : 'sub-agent'} name above to generate their statement.</p>
        </div>
      ) : loading ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📭</div>
          <p>No operations found for this {isClient ? 'client' : 'sub-agent'} and date range.</p>
        </div>
      ) : (
        <>
          {/* Summary metrics */}
          <div className="metrics" style={{ marginBottom: 16 }}>
            <div className="metric">
              <div className="metric-label">Operations</div>
              <div className="metric-val">{rows.length}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Total inv out</div>
              <div className="metric-val" style={{ fontSize: '1.2rem', color: 'var(--navy)' }}>{formatMoney(totalOut)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Total inv in</div>
              <div className="metric-val" style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>{formatMoney(totalIn)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Net</div>
              <div className="metric-val" style={{ fontSize: '1.2rem', color: totalNet >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatMoney(totalNet)}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8 }}>
            💡 Click any invoice amount to edit it inline — changes save automatically.
          </div>

          {/* Printable content */}
          <div ref={printRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--navy)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--navy)' }}>⚓ Baden Agency</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 4 }}>
                  Statement of Account — {isClient ? 'Principal' : 'Sub-Agent'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 6 }}>{searchName}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.8 }}>
                <div>Generated: {today}</div>
                {dateFrom && <div>From: {formatDate(dateFrom)}</div>}
                {dateTo   && <div>To: {formatDate(dateTo)}</div>}
                <div>{rows.length} operation{rows.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Vessel</th>
                      <th>Port</th>
                      <th>{isClient ? 'Sub-Agent' : 'Client'}</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Inv Out</th>
                      <th style={{ textAlign: 'right' }}>Inv In</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const net = (r.inv_out || 0) - (r.inv_in || 0)
                      return (
                        <tr key={r.id}>
                          <td><span className="ref">{r.ref}</span></td>
                          <td style={{ fontWeight: 500 }}>{r.vessel_name || '—'}</td>
                          <td style={{ color: 'var(--muted)' }}>{r.port || '—'}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                            {isClient ? (r.sub_agent || '—') : (r.client_name || '—')}
                          </td>
                          <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(r.op_date)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <EditableAmount
                              value={r.inv_out}
                              currency={r.inv_currency || 'EUR'}
                              onSave={v => saveField(r.id, 'inv_out', v)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <EditableAmount
                              value={r.inv_in}
                              currency={r.inv_currency || 'EUR'}
                              onSave={v => saveField(r.id, 'inv_in', v)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {formatMoney(net, r.inv_currency || 'EUR')}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--navy)', color: '#fff', fontWeight: 700, padding: '10px 14px' }}>TOTAL</td>
                      <td style={{ background: 'var(--navy)', color: '#fff', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '0.82rem', textAlign: 'right', padding: '10px 14px' }}>{formatMoney(totalOut)}</td>
                      <td style={{ background: 'var(--navy)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '0.82rem', textAlign: 'right', padding: '10px 14px' }}>{formatMoney(totalIn)}</td>
                      <td style={{ background: 'var(--navy)', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '0.82rem', textAlign: 'right', padding: '10px 14px', color: totalNet >= 0 ? '#86efac' : '#fca5a5' }}>{formatMoney(totalNet)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Baden Agency — Confidential</span>
              <span>Generated {today}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
