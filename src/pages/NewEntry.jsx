import { useState, useEffect } from 'react'
import { createOperation, getNextSeqNum, useOperations } from '../hooks/useOperations'
import { useClients } from '../hooks/useClients'
import { OP_TYPES, VESSEL_STATUSES, ENTRY_STATUSES, CURRENT_YEAR } from '../lib/constants'
import VesselSearch from '../components/VesselSearch'

const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i)
const BLANK = {
  op_type:'', year:CURRENT_YEAR, vessel_name:'', port:'',
  sub_agent:'', client_name:'', op_date:new Date().toISOString().split('T')[0],
  imo:'', mmsi:'', eta:'', etb:'', etd:'',
  inv_out:'', inv_in:'', inv_currency:'EUR',
  income_local:'', income_eur:'',
  add_services:false, entry_status:'Open', vessel_status:'', notes:'', operator:'Nicolai Baden',
}

export default function NewEntry() {
  const [form, setForm]       = useState(BLANK)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const { clients }           = useClients()
  const { data: allOps }      = useOperations({ limit: 2000 })

  // Build autocomplete lists from existing operations
  const subAgents = [...new Set((allOps || []).map(r => r.sub_agent).filter(Boolean))].sort()
  const ports     = [...new Set((allOps || []).map(r => r.port).filter(Boolean))].sort()

  useEffect(() => {
    if (!form.op_type || !form.year) { setPreview(''); return }
    getNextSeqNum(form.op_type, Number(form.year))
      .then(seq => setPreview(`BA-${form.op_type} ${String(seq).padStart(3,'0')}${form.year}`))
      .catch(() => setPreview(''))
  }, [form.op_type, form.year])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleVesselSelect = ({ name, imo, mmsi }) => {
    setForm(f => ({ ...f, vessel_name: name, imo: imo||'', mmsi: mmsi||'' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const payload = {
        op_type:      form.op_type,
        year:         Number(form.year),
        vessel_name:  form.vessel_name  || null,
        port:         form.port         || null,
        sub_agent:    form.sub_agent    || null,
        client_name:  form.client_name  || null,
        op_date:      form.op_date      || null,
        imo:          form.imo          || null,
        eta:          form.eta          || null,
        etb:          form.etb          || null,
        etd:          form.etd          || null,
        mmsi:         form.mmsi         || null,
        inv_out:      form.inv_out      ? Number(form.inv_out)      : null,
        inv_in:       form.inv_in       ? Number(form.inv_in)       : null,
        inv_currency: form.inv_currency,
        income_local: form.income_local ? Number(form.income_local) : null,
        income_eur:   form.income_eur   ? Number(form.income_eur)   : null,
        add_services: form.add_services,
        entry_status: form.entry_status,
        vessel_status:form.vessel_status || null,
        notes:        form.notes        || null,
        operator:     form.operator     || null,
      }
      const created = await createOperation(payload)
      setSuccess(`✓ Created: ${created.ref}`)
      setForm(BLANK)
      setPreview('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const net = (form.inv_out && form.inv_in)
    ? (Number(form.inv_out) - Number(form.inv_in)).toFixed(2)
    : null

  return (
    <div className="page" style={{ maxWidth:680 }}>
      <div className="page-header"><h1>New Entry</h1></div>

      {error   && <div style={{ background:'var(--red-bg)',   color:'var(--red)',   padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:'0.85rem' }}>{error}</div>}
      {success && <div style={{ background:'var(--green-bg)', color:'var(--green)', padding:'10px 14px', borderRadius:8, marginBottom:14, fontSize:'0.85rem' }}>{success}</div>}

      <form onSubmit={submit}>
        {/* Core */}
        <div className="card" style={{ padding:18, marginBottom:14 }}>
          <div className="section-title">Core details</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Operation Type *</label>
              <select value={form.op_type} onChange={e=>set('op_type',e.target.value)} required>
                <option value="">Select…</option>
                {OP_TYPES.map(t=><option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <select value={form.year} onChange={e=>set('year',e.target.value)}>
                {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {preview && (
              <div className="form-group form-full">
                <label className="form-label">Reference (auto)</label>
                <div style={{
                  padding:'10px 14px', background:'var(--bg)',
                  border:'1.5px solid var(--border)', borderRadius:6,
                  fontFamily:'var(--mono)', fontWeight:700,
                  color:'var(--navy)', letterSpacing:'0.05em',
                }}>{preview}</div>
              </div>
            )}

            <div className="form-group form-full">
              <label className="form-label">Vessel Name * <span style={{ color:'var(--muted)', fontWeight:400 }}>(search to auto-fill IMO)</span></label>
              <VesselSearch
                value={form.vessel_name}
                onChange={v => set('vessel_name', v)}
                onVesselSelect={handleVesselSelect}
              />
            </div>

            {(form.imo || form.mmsi) && (
              <div className="form-full" style={{
                display:'flex', gap:16,
                padding:'8px 12px', background:'var(--bg)',
                borderRadius:6, fontSize:'0.8rem',
              }}>
                {form.imo  && <span style={{ fontFamily:'var(--mono)' }}>IMO: <strong>{form.imo}</strong></span>}
                {form.mmsi && <span style={{ fontFamily:'var(--mono)' }}>MMSI: <strong>{form.mmsi}</strong></span>}
                <button type="button" onClick={()=>setForm(f=>({...f,imo:'',mmsi:''}))}
                  style={{ background:'none', border:'none', color:'var(--muted)',
                           fontSize:'0.8rem', cursor:'pointer', marginLeft:'auto' }}>
                  clear ×
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Registration Date</label>
              <input type="date" value={form.op_date} onChange={e=>set('op_date',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Port *</label>
              <input value={form.port} onChange={e=>set('port',e.target.value)}
                list="ports-list" placeholder="Dakar, Senegal" required />
              <datalist id="ports-list">
                {ports.map(p=><option key={p} value={p} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Sub-Agent / Provider</label>
              <input value={form.sub_agent} onChange={e=>set('sub_agent',e.target.value)}
                list="subagents-list" placeholder="Start typing…" />
              <datalist id="subagents-list">
                {subAgents.map(s=><option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Account / Principal *</label>
              <input value={form.client_name} onChange={e=>set('client_name',e.target.value)}
                list="clients-list" placeholder="Start typing…" required />
              <datalist id="clients-list">
                {clients.map(c=><option key={c.id} value={c.name} />)}
              </datalist>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="card" style={{ padding:18, marginBottom:14 }}>
          <div className="section-title">Financials</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select value={form.inv_currency} onChange={e=>set('inv_currency',e.target.value)}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Services</label>
              <select value={form.add_services} onChange={e=>set('add_services',e.target.value==='true')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Out</label>
              <input type="number" step="0.01" value={form.inv_out}
                onChange={e=>set('inv_out',e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice In</label>
              <input type="number" step="0.01" value={form.inv_in}
                onChange={e=>set('inv_in',e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Income Local</label>
              <input type="number" step="0.01" value={form.income_local}
                onChange={e=>set('income_local',e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Income EUR</label>
              <input type="number" step="0.01" value={form.income_eur}
                onChange={e=>set('income_eur',e.target.value)} placeholder="0.00" />
            </div>
            {net !== null && (
              <div style={{
                gridColumn:'1/-1', background:'var(--bg)',
                padding:'10px 14px', borderRadius:8,
                display:'flex', justifyContent:'space-between',
              }}>
                <span style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Net (inv out − inv in)</span>
                <span style={{ fontWeight:700, color:Number(net)>=0?'var(--green)':'var(--red)' }}>
                  {Number(net).toLocaleString('en-GB',{minimumFractionDigits:2})}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="card" style={{ padding:18, marginBottom:20 }}>
          <div className="section-title">Status</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Entry Status</label>
              <select value={form.entry_status} onChange={e=>set('entry_status',e.target.value)}>
                {ENTRY_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vessel Status</label>
              <select value={form.vessel_status} onChange={e=>set('vessel_status',e.target.value)}>
                <option value="">— none —</option>
                {VESSEL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operator</label>
              <select value={form.operator} onChange={e=>set('operator',e.target.value)}>
                <option value="Nicolai Baden">Nicolai Baden</option>
                <option value="Romeo Baden">Romeo Baden</option>
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Notes</label>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)}
                rows={3} placeholder="Any notes…" />
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:12 }}>
          <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={loading}>
            {loading ? 'Submitting…' : '✓ Submit Entry'}
          </button>
          <button type="button" className="btn-secondary" onClick={()=>setForm(BLANK)}>Clear</button>
        </div>
      </form>
    </div>
  )
}
