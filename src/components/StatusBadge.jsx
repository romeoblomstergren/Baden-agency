export function VesselStatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>
  const cls = {
    'Underway':  'badge badge-underway',
    'At Anchorage':   'badge badge-in-port',
    'Alongside': 'badge badge-alongside',
    'Sailed':    'badge badge-sailed',
  }[status] || 'badge badge-sailed'
  const dot = { 'Underway':'🟢', 'At Anchorage':'🔵', 'Alongside':'🟡', 'Sailed':'⚫' }[status] || ''
  return <span className={cls}><span style={{ fontSize: '0.6rem' }}>{dot}</span>{status}</span>
}

export function EntryStatusBadge({ status }) {
  if (!status) return null
  const cls = {
    'Open':      'badge badge-open',
    'Closed':    'badge badge-closed',
    'Pending':   'badge badge-pending',
    'Disputed':  'badge badge-disputed',
    'Partial':   'badge badge-pending',
    'Cancelled': 'badge badge-sailed',
  }[status] || 'badge badge-closed'
  return <span className={cls}>{status}</span>
}

export function OpTypeBadge({ code }) {
  const colors = {
    OPA:'#1B2A4A', BOC:'#2E5090', HUS:'#1A5E38',
    PAG:'#7B3F00', BRO:'#5C3566', TRA:'#B5510A',
    MAR:'#1A4A6B', ENQ:'#7F3F3F',
  }
  const bg = colors[code] || '#888'
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color: '#fff',
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 4,
      fontFamily: 'var(--mono)',
    }}>{code}</span>
  )
}
