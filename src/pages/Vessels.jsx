import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VesselSearch from '../components/VesselSearch'

function useVessels(search) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('vessels').select('*').order('name')
    if (search) q = q.or(`name.ilike.%${search}%,imo.ilike.%${search}%,flag.ilike.%${search}%,vessel_type.ilike.%${search}%`)
    const { data } = await q
    setData(data || [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

const BLANK = { name:'', imo:'', mmsi:'', call_sign:'', flag:'', vessel_type:'', gt:'', dwt:'', loa:'', beam:'', year_built:'' }

export default function Vessels() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { data, loading, refetch } = useVessels(search)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openNew = () => { setForm(BLANK); setSelected(null); setEditing(true) }
  const openEdit = (v) => { setForm({ ...v }); setSelected(v); setEditing(true) }
  const closeEdit = () => { setEditing(false); setSelected(null); setError('') }

  const handleVesselSelect = (v) => {
    setForm(f => ({
      ...f,
      name:        v.name        || f.name,
      imo:         v.imo         || f.imo,
      mmsi:        v.mmsi        || f.mmsi,
      call_sign:   v.call_sign   || f.call_sign,
      flag:        v.flag        || f.flag,
      vessel_type: v.vessel_type || f.vessel_type,
      gt:          v.gt          || f.gt,
      dwt:         v.dwt         || f.dwt,
      loa:         v.loa         || f.loa,
      beam:        v.beam        || f.beam,
      year_built:  v.year_built  || f.year_built,
    }))
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Vessel name is required'); return }
    setSaving(true); setError('')
    try {
      const { id, created_at, updated_at, ...rest } = form
      // Check for duplicate IMO before inserting
      if (!selected && rest.imo) {
        const { data: existing } = await supabase.from('vessels').select('id').eq('imo', rest.imo).maybeSingle()
        if (existing) {
          setError('A vessel with this IMO already exists in the database.')
          setSaving(false); return
        }
      }
      if (selected) {
        await supabase.from('vessels').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', selected.id)
      } else {
        await supabase.from('vessels').insert([rest])
      }
      refetch(); closeEdit()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this vessel? Cannot be undone.')) return
    await supabase.from('vessels').delete().eq('id', id)
    refetch()
  }

  const typeColor = (type) => {
    if (!type) return { bg: 'var(--gray-bg,#f3f4f6)', color: 'var(--muted)' }
    if (type.toLowerCase().includes('bulk'))      return { bg: 'var(--blue-bg)', color: 'var(--blue)' }
    if (type.toLowerCase().includes('tanker'))    return { bg: 'var(--amber-bg)', color: 'var(--amber)' }
    if (type.toLowerCase().includes('container')) return { bg: 'var(--green-bg)', color: 'var(--green)' }
    return { bg: 'var(--gray-bg,#f3f4f6)', color: 'var(--muted)' }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Vessel Database</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            {loading ? '…' : `${data.length} vessels`}
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={openNew}>+ Add vessel</button>
      </div>

      <input placeholder="Search by name, IMO, flag, type…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }} />

      {loading ? <div className="spinner" /> : data.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">🚢</div>
          <p>No vessels found.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vessel</th><th>IMO</th><th>MMSI</th><th>Flag</th>
                  <th>Type</th><th>GT</th><th>DWT</th><th>LOA</th><th>Year</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(v => {
                  const tc = typeColor(v.vessel_type)
                  return (
                    <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(v)}>
                      <td style={{ fontWeight: 600 }}>{v.name}</td>
                      <td><span className="ref">{v.imo || '—'}</span></td>
                      <td><span className="ref">{v.mmsi || '—'}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{v.flag || '—'}</td>
                      <td>{v.vessel_type ? <span style={{ background: tc.bg, color: tc.color, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{v.vessel_type}</span> : '—'}</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{v.gt || '—'}</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{v.dwt || '—'}</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>{v.loa ? v.loa + 'm' : '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{v.year_built || '—'}</td>
                      <td onClick={e => { e.stopPropagation(); del(v.id) }} style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>🗑</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <>
          <div onClick={closeEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520, background: 'var(--surface)', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', animation: 'slideIn 0.22s ease' }}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>Vessel Database</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>{selected ? selected.name : 'New vessel'}</div>
              </div>
              <button onClick={closeEdit} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}
              <div className="section-title" style={{ marginTop: 0 }}>Search to auto-fill</div>
              <div style={{ marginBottom: 20 }}>
                <VesselSearch value="" onChange={() => {}} onVesselSelect={handleVesselSelect} />
              </div>
              <div className="section-title">Identity</div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group form-full">
                  <label className="form-label">Vessel name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="MV Spar Gemini" />
                </div>
                <div className="form-group"><label className="form-label">IMO</label><input value={form.imo || ''} onChange={e => set('imo', e.target.value)} style={{ fontFamily: 'var(--mono)' }} placeholder="9307580" /></div>
                <div className="form-group"><label className="form-label">MMSI</label><input value={form.mmsi || ''} onChange={e => set('mmsi', e.target.value)} style={{ fontFamily: 'var(--mono)' }} placeholder="257801000" /></div>
                <div className="form-group"><label className="form-label">Call Sign</label><input value={form.call_sign || ''} onChange={e => set('call_sign', e.target.value)} style={{ fontFamily: 'var(--mono)' }} /></div>
                <div className="form-group"><label className="form-label">Flag</label><input value={form.flag || ''} onChange={e => set('flag', e.target.value)} placeholder="Norway" /></div>
                <div className="form-group form-full"><label className="form-label">Vessel Type</label><input value={form.vessel_type || ''} onChange={e => set('vessel_type', e.target.value)} placeholder="Bulk Carrier, Tanker…" /></div>
              </div>
              <div className="section-title">Dimensions</div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                {[['gt','Gross Tonnage'],['dwt','DWT'],['loa','LOA (m)'],['beam','Beam (m)'],['year_built','Year Built']].map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input value={form[k] || ''} onChange={e => set(k, e.target.value)} style={{ fontFamily: 'var(--mono)' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface)' }}>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Saving…' : '✓ Save vessel'}</button>
              <button onClick={closeEdit} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
