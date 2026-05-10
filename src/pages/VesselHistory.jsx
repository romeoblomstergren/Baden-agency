import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoney } from '../lib/constants'
import { VesselStatusBadge, EntryStatusBadge, OpTypeBadge } from '../components/Layout'

export default function VesselHistory() {
  const { vesselName } = useParams()
  const navigate = useNavigate()
  const decoded = decodeURIComponent(vesselName ?? '')
  const [ops, setOps]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('operations')
        .select('*')
        .ilike('vessel_name', decoded)
        .order('op_date', { ascending: false })
      setOps(data ?? [])
      setLoading(false)
    }
    if (decoded) load()
  }, [decoded])

  const ports    = [...new Set(ops.map(o => o.port).filter(Boolean))]
  const revenue  = ops.reduce((s, o) => s + (o.net ?? 0), 0)
  const firstYear = ops.length ? new Date(ops[ops.length-1].op_date ?? ops[ops.length-1].created_at).getFullYear() : '—'

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">← Back</button>
        <div>
          <h1 style={{ margin: 0 }}>{decoded}</h1>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>Vessel operation history</div>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total operations', value: ops.length },
            { label: 'Ports called', value: ports.length },
            { label: 'Net revenue', value: formatMoney(revenue, 'USD') },
            { label: 'First seen', value: firstYear },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ flex: 1, minWidth: 120, padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ports */}
      {ports.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {ports.map(p => (
            <span key={p} style={{ padding: '4px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: '0.78rem', color: 'var(--muted)' }}>{p}</span>
          ))}
        </div>
      )}

      {/* Operations table */}
      <div className="card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}>
          All Operations
        </div>
        {loading ? <div className="spinner" style={{ margin: 24 }} /> : ops.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No operations found for "{decoded}"</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ref</th><th>Type</th><th>Date</th><th>Port</th><th>Principal</th><th>Vessel status</th><th>Entry status</th><th>Net</th></tr>
              </thead>
              <tbody>
                {ops.map(op => (
                  <tr key={op.id}>
                    <td><span className="ref">{op.ref}</span></td>
                    <td><OpTypeBadge code={op.op_type} /></td>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(op.op_date)}</td>
                    <td style={{ color: 'var(--muted)' }}>{op.port || '—'}</td>
                    <td style={{ color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.client_name || '—'}</td>
                    <td><VesselStatusBadge status={op.vessel_status} /></td>
                    <td><EntryStatusBadge status={op.entry_status} /></td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap', color: (op.net ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {op.net != null ? formatMoney(op.net, op.inv_currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
