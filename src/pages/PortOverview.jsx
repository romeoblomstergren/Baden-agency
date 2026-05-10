import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/constants'
import { VesselStatusBadge, EntryStatusBadge, OpTypeBadge } from '../components/Layout'
import EditPanel from '../components/EditPanel'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
}

function ETAChip({ label, dateStr }) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  const isOverdue = days < 0, isToday = days === 0, isSoon = days > 0 && days <= 2
  const bg    = isOverdue ? 'var(--red-bg)'   : isToday ? 'var(--amber-bg)' : isSoon ? '#FFF8E1' : 'var(--bg)'
  const color = isOverdue ? 'var(--red)'      : isToday ? 'var(--amber)'    : isSoon ? '#854F0B' : 'var(--muted)'
  const text  = isOverdue ? `${Math.abs(days)}d overdue` : isToday ? 'Today' : `in ${days}d`
  return (
    <span style={{ background: bg, color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: isOverdue ? '1px solid var(--red)' : 'none' }}>
      {label}: {formatDate(dateStr)} ({text})
    </span>
  )
}

export default function PortOverview() {
  const [operations, setOperations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [portFilter, setPortFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editOp, setEditOp]         = useState(null)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('operations')
      .select('*')
      .in('vessel_status', ['Alongside', 'In Port', 'Underway', 'Expected'])
      .neq('entry_status', 'Closed')
      .order('eta', { ascending: true })

    if (portFilter)   q = q.ilike('port', `%${portFilter}%`)
    if (statusFilter) q = q.eq('vessel_status', statusFilter)

    const { data } = await q
    setOperations(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [portFilter, statusFilter])

  const ports = [...new Set(operations.map(o => o.port).filter(Boolean))].sort()

  // Group by port
  const grouped = operations.reduce((acc, op) => {
    const port = op.port || 'Unknown Port'
    if (!acc[port]) acc[port] = []
    acc[port].push(op)
    return acc
  }, {})

  const STATUS_COLORS = {
    'Alongside': { color: 'var(--amber)', bg: 'var(--amber-bg)', dot: '🟡' },
    'In Port':   { color: 'var(--blue)',  bg: 'var(--blue-bg)',  dot: '🔵' },
    'Underway':  { color: 'var(--green)', bg: 'var(--green-bg)', dot: '🟢' },
    'Expected':  { color: 'var(--muted)', bg: 'var(--bg)',       dot: '⚪' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Port Overview</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            Expected & active vessels by port
          </p>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          {loading ? '…' : `${operations.length} vessel${operations.length !== 1 ? 's' : ''} across ${Object.keys(grouped).length} port${Object.keys(grouped).length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Filter by port…"
          value={portFilter}
          onChange={e => setPortFilter(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All statuses</option>
          <option value="Alongside">🟡 Alongside</option>
          <option value="In Port">🔵 In Port</option>
          <option value="Underway">🟢 Underway</option>
          <option value="Expected">⚪ Expected</option>
        </select>
        <button onClick={() => { setPortFilter(''); setStatusFilter('') }} className="btn-secondary btn-sm">Clear</button>
      </div>

      {loading ? <div className="spinner" /> : operations.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">⚓</div>
          <p>No active vessels found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(grouped).map(([port, ops]) => (
            <div key={port}>
              {/* Port header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>📍 {port}</div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {ops.length} vessel{ops.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Vessel cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ops.map(op => {
                  const sc = STATUS_COLORS[op.vessel_status] || STATUS_COLORS['Expected']
                  const etdDays = daysUntil(op.etd)
                  const isOverdue = op.etd && etdDays < 0
                  return (
                    <div key={op.id}
                      onClick={() => setEditOp(op)}
                      className="card"
                      style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: `4px solid ${sc.color}`, transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Left: vessel info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{op.vessel_name || '—'}</span>
                            <OpTypeBadge code={op.op_type} />
                            <span style={{ background: sc.bg, color: sc.color, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                              {sc.dot} {op.vessel_status}
                            </span>
                            {isOverdue && (
                              <span style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--red)' }}>
                                ⚠️ ETD overdue {Math.abs(etdDays)}d
                              </span>
                            )}
                          </div>

                          {/* Cargo */}
                          {(op.commodity || op.cargo_terms) && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>
                              📦 {[op.commodity, op.quantity, op.cargo_terms].filter(Boolean).join(' · ')}
                              {op.commodity_2 && ` + ${op.commodity_2}${op.quantity_2 ? ' ' + op.quantity_2 : ''}`}
                            </div>
                          )}

                          {/* Vessel specs */}
                          {(op.vessel_type || op.dwt || op.loa || op.flag) && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--mono)' }}>
                              {[op.vessel_type, op.flag, op.dwt ? `${op.dwt} DWT` : '', op.loa ? `${op.loa}m LOA` : ''].filter(Boolean).join(' · ')}
                            </div>
                          )}

                          {/* Timeline */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <ETAChip label="ETA" dateStr={op.eta} />
                            <ETAChip label="ETB" dateStr={op.etb} />
                            <ETAChip label="ETD" dateStr={op.etd} />
                          </div>
                        </div>

                        {/* Right: principal + ref */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>{op.ref}</div>
                          {op.client_name && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>👤 {op.client_name}</div>}
                          {op.sub_agent   && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>🤝 {op.sub_agent}</div>}
                          {op.operator    && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{op.operator}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editOp && <EditPanel operation={editOp} onClose={() => setEditOp(null)} onSaved={load} />}
    </div>
  )
}
