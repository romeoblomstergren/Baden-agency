import { useState, useEffect } from 'react'
import VesselSearch from './VesselSearch'
import AIVesselSearch from './AIVesselSearch'
import { updateOperation, deleteOperation } from '../hooks/useOperations'
import { useOperationLogs } from '../hooks/usePortInfo'
import { OP_TYPES, VESSEL_STATUSES, ENTRY_STATUSES, formatDate, formatMoney } from '../lib/constants'

export default function EditPanel({ operation, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [newLog, setNewLog] = useState('')
  const [addingLog, setAddingLog] = useState(false)
  const [showVesselSearch, setShowVesselSearch] = useState(false)
  const [showAISearch, setShowAISearch] = useState(false)
  const { logs, addLog, refetch: refetchLogs } = useOperationLogs(operation?.id)

  useEffect(() => { if (operation) setForm({ ...operation }) }, [operation])

  if (!operation) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setError('')
    try {
      const { id, created_at, updated_at, created_by, updated_by, net, _tab, ...rest } = form
      await updateOperation(operation.id, rest)
      onSaved(); onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const del = async () => {
    setDeleting(true)
    try { await deleteOperation(operation.id); onSaved(); onClose() }
    catch (e) { setError(e.message); setDeleting(false) }
  }

  const trackMT = () => {
    if (form.mmsi) return window.open(`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${form.mmsi}`, '_blank')
    if (form.imo) return window.open(`https://www.marinetraffic.com/en/ais/details/ships/imo:${form.imo}`, '_blank')
    const q = (form.vessel_name || '').replace(/^(MV|MT|MS|SS|SV)\s+/i, '').trim()
    window.open('https://www.marinetraffic.com/en/ais/index/search/all/keyword:' + q, '_blank')
  }

  const net = (form.inv_out || 0) - (form.inv_in || 0)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg)', width: '90%', maxWidth: 900, maxHeight: '90vh', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{operation.ref}</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>{operation.vessel_name || '—'}</div>
          </div>
          <button onClick={trackMT} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer' }}>🚢 Track</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}

          <div className="section-title">Vessel</div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <input value={form.vessel_name || ''} onChange={e => set('vessel_name', e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowAISearch(true)} className="btn-primary btn-sm" style={{ marginRight: 8 }}>
                🤖 AI Search
              </button>
              <button type="button" onClick={() => setShowVesselSearch(true)} className="btn-secondary btn-sm">
                🔍 Search
              </button>
            </div>
          </div>

          <div className="section-title">Core details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">IMO</label>
              <input value={form.imo || ''} onChange={e => set('imo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">MMSI</label>
              <input value={form.mmsi || ''} onChange={e => set('mmsi', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Call Sign</label>
              <input value={form.call_sign || ''} onChange={e => set('call_sign', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Flag</label>
              <input value={form.flag || ''} onChange={e => set('flag', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vessel Type</label>
              <input value={form.vessel_type || ''} onChange={e => set('vessel_type', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">GT</label>
              <input value={form.gt || ''} onChange={e => set('gt', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">DWT</label>
              <input value={form.dwt || ''} onChange={e => set('dwt', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">LOA</label>
              <input value={form.loa || ''} onChange={e => set('loa', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Beam</label>
              <input value={form.beam || ''} onChange={e => set('beam', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input value={form.year_built || ''} onChange={e => set('year_built', e.target.value)} />
            </div>
          </div>

          <div className="section-title">Operator</div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <select value={form.operator || ''} onChange={e => set('operator', e.target.value)}>
              <option value="">— unassigned —</option>
              <option value="Nicolai Baden">Nicolai Baden</option>
              <option value="Romeo Baden">Romeo Baden</option>
            </select>
          </div>

          <div className="section-title">Notes</div>
          <div className="form-group">
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={4} />
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface)' }}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Saving…' : '✓ Save changes'}</button>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}>Delete</button>
          ) : (
            <button onClick={del} disabled={deleting} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}>{deleting ? 'Deleting…' : '✓ Confirm delete'}</button>
          )}
        </div>
      </div>

      {showVesselSearch && (
        <VesselSearch
          value={form.vessel_name}
          onSelect={(v) => {
            set('vessel_name', v.name)
            if (v.imo) set('imo', v.imo)
            if (v.mmsi) set('mmsi', v.mmsi)
            if (v.call_sign) set('call_sign', v.call_sign)
            if (v.flag) set('flag', v.flag)
            if (v.vessel_type) set('vessel_type', v.vessel_type)
            if (v.gt) set('gt', v.gt)
            if (v.dwt) set('dwt', v.dwt)
            if (v.loa) set('loa', v.loa)
            if (v.beam) set('beam', v.beam)
            if (v.year_built) set('year_built', v.year_built)
            setShowVesselSearch(false)
          }}
          onClose={() => setShowVesselSearch(false)}
        />
      )}

      {showAISearch && (
        <AIVesselSearch
          onSelect={(vessel) => {
            set('vessel_name', vessel.name || vessel.vessel_name)
            if (vessel.imo) set('imo', vessel.imo)
            if (vessel.mmsi) set('mmsi', vessel.mmsi)
            if (vessel.call_sign) set('call_sign', vessel.call_sign)
            if (vessel.flag) set('flag', vessel.flag)
            if (vessel.vessel_type) set('vessel_type', vessel.vessel_type)
            if (vessel.gt) set('gt', vessel.gt)
            if (vessel.dwt) set('dwt', vessel.dwt)
            if (vessel.loa) set('loa', vessel.loa)
            if (vessel.beam) set('beam', vessel.beam)
            if (vessel.year_built) set('year_built', vessel.year_built)
            setShowAISearch(false)
          }}
          onClose={() => setShowAISearch(false)}
        />
      )}
    </div>
  )
}
