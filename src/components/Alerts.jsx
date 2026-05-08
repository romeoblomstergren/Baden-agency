import { useMemo } from 'react'
import { useOperations } from '../hooks/useOperations'
import { formatDate } from '../lib/constants'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
}

export default function Alerts() {
  const { data } = useOperations({ limit: 2000 })

  const alerts = useMemo(() => {
    const list = []
    const today = new Date().setHours(0,0,0,0)

    data.forEach(op => {
      if (op.entry_status === 'Closed' || op.entry_status === 'Cancelled') return

      // ETA approaching (within 2 days)
      if (op.eta) {
        const days = daysUntil(op.eta)
        if (days !== null && days >= 0 && days <= 2) {
          list.push({
            id: `eta-${op.id}`,
            type: 'eta',
            priority: days === 0 ? 'high' : 'medium',
            icon: '⚓',
            message: `${op.vessel_name} ETA ${days === 0 ? 'TODAY' : `in ${days}d`} — ${op.port}`,
            sub: `${op.ref} · ${op.client_name || '—'}`,
            op,
          })
        }
      }

      // ETD approaching (within 2 days)
      if (op.etd && op.vessel_status !== 'Sailed') {
        const days = daysUntil(op.etd)
        if (days !== null && days >= 0 && days <= 2) {
          list.push({
            id: `etd-${op.id}`,
            type: 'etd',
            priority: days === 0 ? 'high' : 'medium',
            icon: '🚢',
            message: `${op.vessel_name} ETD ${days === 0 ? 'TODAY' : `in ${days}d`} — ${op.port}`,
            sub: `${op.ref} · ${op.client_name || '—'}`,
            op,
          })
        }
      }

      // ETD overdue
      if (op.etd && op.vessel_status !== 'Sailed') {
        const days = daysUntil(op.etd)
        if (days !== null && days < 0) {
          list.push({
            id: `overdue-${op.id}`,
            type: 'overdue',
            priority: 'high',
            icon: '⚠️',
            message: `${op.vessel_name} ETD overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`,
            sub: `${op.ref} · ${op.port} · ${op.client_name || '—'}`,
            op,
          })
        }
      }

      // Outstanding invoice (inv_out set, inv_in not set, entry open > 14 days)
      if (op.inv_out && !op.inv_in && op.op_date) {
        const daysSince = -daysUntil(op.op_date)
        if (daysSince > 14) {
          list.push({
            id: `invoice-${op.id}`,
            type: 'invoice',
            priority: daysSince > 30 ? 'high' : 'medium',
            icon: '💰',
            message: `Outstanding invoice — ${op.vessel_name || op.ref}`,
            sub: `${op.ref} · ${op.client_name || '—'} · ${daysSince}d ago`,
            op,
          })
        }
      }
    })

    // Sort by priority (high first)
    return list.sort((a, b) => a.priority === 'high' ? -1 : 1)
  }, [data])

  if (alerts.length === 0) return null

  const colors = {
    high:   { bg: 'var(--red-bg)',   color: 'var(--red)',   border: '#fca5a5' },
    medium: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: '#fcd34d' },
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>🔔 Alerts</span>
        <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
          {alerts.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map(alert => {
          const c = colors[alert.priority]
          return (
            <div key={alert.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              background: c.bg, border: `1px solid ${c.border}`,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{alert.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: c.color }}>{alert.message}</div>
                <div style={{ fontSize: '0.75rem', color: c.color, opacity: 0.8, marginTop: 2 }}>{alert.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
