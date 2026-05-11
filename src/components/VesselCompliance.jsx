import { useState, useEffect } from 'react'

function fmt(n, decimals = 0) {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('en-GB', { maximumFractionDigits: decimals })
}

function EmissionsCard({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '12px 0' }}>
      No EU MRV emissions data available for this vessel.
    </div>
  )

  const latest = data[0]
  const prev   = data[1]

  const co2Change = prev
    ? ((latest.co2_emissions_total - prev.co2_emissions_total) / prev.co2_emissions_total * 100).toFixed(1)
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>EU MRV — {latest.reporting_period}</span>
        {co2Change && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: co2Change > 0 ? 'var(--red-bg)' : 'var(--green-bg)',
            color: co2Change > 0 ? 'var(--red)' : 'var(--green)',
          }}>
            {co2Change > 0 ? '↑' : '↓'} {Math.abs(co2Change)}% vs {prev.reporting_period}
          </span>
        )}
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>
          Verified by {latest.verifier_name?.split(' ')[0]}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Total CO₂', value: fmt(latest.co2_emissions_total) + ' t', sub: 'Total emissions' },
          { label: 'At Berth CO₂', value: fmt(latest.co2_emissions_at_berth) + ' t', sub: 'Port emissions' },
          { label: 'Fuel Total', value: fmt(latest.fuel_consumption_total) + ' t', sub: 'All fuel types' },
          { label: 'CO₂ / nm', value: fmt(latest.co2_per_distance, 1) + ' kg', sub: 'Per nautical mile' },
          { label: 'CO₂ / t·nm', value: fmt(latest.co2_per_transport_work, 2), sub: 'Transport efficiency' },
          { label: 'Time at Sea', value: fmt(latest.total_time_at_sea) + ' h', sub: 'Hours underway' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--mono)' }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {latest.technical_efficiency && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8 }}>
          Efficiency: <strong>{latest.technical_efficiency}</strong>
          {latest.doc_expiry_date && ` · DOC expires: ${latest.doc_expiry_date}`}
        </div>
      )}

      {data.length > 1 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer' }}>
            Previous years ({data.length - 1})
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.slice(1).map(e => (
              <div key={e.reporting_period} style={{ display: 'flex', gap: 16, fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, minWidth: 40 }}>{e.reporting_period}</span>
                <span>CO₂: {fmt(e.co2_emissions_total)} t</span>
                <span>Fuel: {fmt(e.fuel_consumption_total)} t</span>
                <span style={{ color: 'var(--muted)' }}>{e.verifier_name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function InspectionsCard({ inspections, count }) {
  if (!inspections || inspections.length === 0) return (
    <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '12px 0' }}>
      No PSC inspection records found for this vessel.
    </div>
  )

  const detentions = inspections.filter(i => i.detained).length
  const totalDeficiencies = inspections.reduce((s, i) => s + (i.deficiencies || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{count || inspections.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Total inspections</div>
        </div>
        <div style={{ background: detentions > 0 ? 'var(--red-bg)' : 'var(--green-bg)', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: detentions > 0 ? 'var(--red)' : 'var(--green)' }}>{detentions}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Detentions</div>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalDeficiencies}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Total deficiencies</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {inspections.slice(0, 10).map((insp, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: insp.detained ? 'var(--red-bg)' : 'var(--bg)',
            borderRadius: 8, fontSize: '0.8rem',
            border: insp.detained ? '1px solid var(--red)' : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{insp.port || '—'}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{insp.mou_region}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—'}
            </div>
            {insp.deficiencies > 0 && (
              <span style={{ background: 'var(--amber-bg)', color: 'var(--amber)', fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 20 }}>
                {insp.deficiencies} def.
              </span>
            )}
            {insp.detained && (
              <span style={{ background: 'var(--red)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                DETAINED
              </span>
            )}
            {!insp.detained && insp.deficiencies === 0 && (
              <span style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✓ Clean</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VesselCompliance({ mmsi, imo }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState('emissions')

  useEffect(() => {
    if (!mmsi && !imo) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const id     = mmsi || imo
        const idType = mmsi ? 'mmsi' : 'imo'
        const r = await fetch(`/api/vessel-compliance?id=${id}&idType=${idType}`)
        if (r.ok && !cancelled) setData(await r.json())
      } catch(e) { console.error(e) }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [mmsi, imo])

  if (!mmsi && !imo) return null

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        {[
          { id: 'emissions',    label: '🌿 Emissions' },
          { id: 'inspections',  label: '🔍 PSC Inspections' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 500, background: 'transparent',
            color: tab === t.id ? 'var(--navy)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--navy)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: '0.82rem' }}>
          <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--navy)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Loading compliance data…
        </div>
      ) : data ? (
        tab === 'emissions'
          ? <EmissionsCard data={data.emissions} />
          : <InspectionsCard inspections={data.inspections} count={data.inspection_count} />
      ) : null}
    </div>
  )
}
