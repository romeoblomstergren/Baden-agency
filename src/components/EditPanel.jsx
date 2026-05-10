import { useState, useEffect } from 'react'
import VesselSearch from './VesselSearch'
import { deleteOperation } from '../hooks/useOperations'
import { useOperationLogs } from '../hooks/usePortInfo'
import { useAI } from '../hooks/useAI'
import { supabase } from '../lib/supabase'
import { VESSEL_STATUSES, ENTRY_STATUSES, formatDate, formatMoney } from '../lib/constants'

const EMAIL_TYPES = [
  { label: 'Port Agency Appointment', value: 'appointment' },
  { label: 'ETA Notification', value: 'eta' },
  { label: 'OPA Letter', value: 'opa' },
  { label: 'NOR Tender', value: 'nor' },
  { label: 'Proforma DA', value: 'proforma' },
  { label: 'ETD / Departure Notice', value: 'etd' },
]

function AIEmailPanel({ operation, onClose }) {
  const [type, setType]     = useState('appointment')
  const [draft, setDraft]   = useState('')
  const [copied, setCopied] = useState(false)
  const { ask, loading }    = useAI()

  const SYSTEM = `You are a professional shipping agency email writer for Baden Agency.
Write formal, concise maritime emails. Always include: Subject line, proper salutation, professional body, and sign-off with "Baden Agency".
Use correct maritime terminology. Be specific with vessel details provided.`

  const prompt = {
    appointment: `Write a port agency appointment letter for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETA: ${operation.eta ? formatDate(operation.eta) : 'TBC'}\nRef: ${operation.ref}`,
    eta: `Write an ETA notification email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETA: ${operation.eta ? formatDate(operation.eta) : 'TBC'}\nRef: ${operation.ref}`,
    opa: `Write an OPA appointment letter for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nRef: ${operation.ref}`,
    nor: `Write a NOR tender email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nCommodity: ${operation.commodity || 'cargo'}\nETB: ${operation.etb ? formatDate(operation.etb) : 'TBC'}\nRef: ${operation.ref}`,
    proforma: `Write a proforma DA covering email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nRef: ${operation.ref}`,
    etd: `Write a departure/ETD notification for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETD: ${operation.etd ? formatDate(operation.etd) : 'TBC'}\nRef: ${operation.ref}`,
  }

  async function generate() {
    setDraft('')
    const result = await ask(prompt[type], { system: SYSTEM, max_tokens: 1000 })
    if (result) setDraft(result)
  }

  async function copy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function openMail() {
    const lines = draft.split('\n')
    const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'))
    const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : `${operation.vessel_name} — ${operation.ref}`
    const body = draft.replace(/^subject:.*\n?/im, '').trim()
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 301, width: '90%', maxWidth: 580, background: 'var(--surface)', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '16px 16px 0 0' }}>
          <span style={{ color: 'var(--blue)', fontSize: '1rem' }}>✦</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>AI Email Drafter</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{operation.vessel_name} · {operation.ref}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {EMAIL_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: type === t.value ? 'var(--navy)' : 'var(--bg)', color: type === t.value ? '#fff' : 'var(--muted)', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary btn-sm" style={{ marginBottom: 16 }}>
            {loading ? '◌ Generating…' : '✦ Generate email'}
          </button>
          {draft && (
            <>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16}
                style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={copy}     className="btn-secondary btn-sm">{copied ? '✓ Copied' : '📋 Copy'}</button>
                <button onClick={openMail} className="btn-primary btn-sm">✉️ Open in Mail</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function EditPanel({ operation, onClose, onSaved }) {
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState('')
  const [confirm, setConfirm]     = useState(false)
  const [newLog, setNewLog]       = useState('')
  const [addingLog, setAddingLog] = useState(false)
  const [showAIEmail, setShowAIEmail] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const { logs, addLog } = useOperationLogs(operation?.id)

  useEffect(() => {
    if (operation) {
      setForm({ ...operation })
      setActiveTab(0)
      setError('')
      setConfirm(false)
    }
  }, [operation?.id])

  if (!operation) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const ALLOWED = [
        'op_type','year','vessel_name','port','sub_agent','client_name','op_date',
        'imo','mmsi','eta','etb','etc','etd','eta_ampm','etb_ampm','etc_ampm','etd_ampm',
        'inv_out','inv_in','inv_currency','income_local','income_eur',
        'add_services','add_services_info','add_inv_out','add_inv_in',
        'entry_status','vessel_status','notes','operator',
        'commodity','quantity','commodity_2','quantity_2','cargo_terms',
        'vessel_type','call_sign','flag','gt','dwt','loa','beam','year_built',
      ]
      const payload = {}
      for (const key of ALLOWED) {
        if (key in form) payload[key] = form[key] ?? null
      }
      const { error: dbError } = await supabase
        .from('operations')
        .update(payload)
        .eq('id', operation.id)
      if (dbError) throw new Error(dbError.message)
      onSaved()
      onClose()
    } catch(e) {
      setError(e.message || 'Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    setDeleting(true)
    try { await deleteOperation(operation.id); onSaved(); onClose() }
    catch(e) { setError(e.message); setDeleting(false) }
  }

  const submitLog = async () => {
    if (!newLog.trim()) return
    setAddingLog(true)
    await addLog(newLog.trim())
    setNewLog(''); setAddingLog(false)
  }

  const trackMT = () => {
    if (form.mmsi) return window.open(`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${form.mmsi}`, '_blank')
    if (form.imo)  return window.open(`https://www.marinetraffic.com/en/ais/details/ships/imo:${form.imo}`, '_blank')
    const q = (form.vessel_name || '').replace(/^(MV|MT|MS|SS|SV)\s+/i, '').trim()
    window.open(`https://www.marinetraffic.com/en/ais/index/search/all/keyword:${q}`, '_blank')
  }

  const net = (form.inv_out || 0) - (form.inv_in || 0)

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'100%', maxWidth:520, background:'var(--surface)', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', animation:'slideIn 0.22s ease' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--navy)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.72rem', fontFamily:'var(--mono)' }}>{operation.ref}</div>
            <div style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem', marginTop:2 }}>{operation.vessel_name || '—'}</div>
          </div>
          <button onClick={() => setShowAIEmail(true)} style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:6, padding:'6px 10px', fontSize:'0.78rem', cursor:'pointer' }}>✦ Email</button>
          <button onClick={trackMT} style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:6, padding:'6px 10px', fontSize:'0.78rem', cursor:'pointer' }}>🚢 Track</button>
          <button onClick={onClose} style={{ background:'transparent', color:'rgba(255,255,255,0.7)', border:'none', fontSize:'1.4rem', cursor:'pointer', lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
          {['Details', 'Activity log'].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              style={{ flex:1, padding:'10px', border:'none', cursor:'pointer', fontSize:'0.85rem', fontWeight:500,
                background: activeTab===i ? 'var(--surface)' : 'transparent',
                color: activeTab===i ? 'var(--navy)' : 'var(--muted)',
                borderBottom: activeTab===i ? '2px solid var(--navy)' : '2px solid transparent' }}>
              {tab}{tab==='Activity log' && logs.length > 0 ? ` (${logs.length})` : ''}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {error && <div style={{ background:'var(--red-bg)', color:'var(--red)', padding:'10px 14px', borderRadius:8, fontSize:'0.85rem', marginBottom:16 }}>{error}</div>}

          {activeTab === 0 ? (<>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div className="form-group">
                <label className="form-label">Entry Status</label>
                <select value={form.entry_status||''} onChange={e=>set('entry_status',e.target.value)}>
                  {ENTRY_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vessel Status</label>
                <select value={form.vessel_status||''} onChange={e=>set('vessel_status',e.target.value||null)}>
                  <option value="">— none —</option>
                  {VESSEL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="section-title">Core details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Vessel Name</label>
                <input value={form.vessel_name||''} onChange={e=>set('vessel_name',e.target.value)} style={{ marginBottom:6 }}/>
                <VesselSearch value="" onChange={()=>{}} onVesselSelect={async v => {
                  const fields = {}
                  if(v.name)        fields.vessel_name = v.name
                  if(v.imo)         fields.imo         = v.imo
                  if(v.mmsi)        fields.mmsi        = v.mmsi
                  if(v.call_sign)   fields.call_sign   = v.call_sign
                  if(v.flag)        fields.flag        = v.flag
                  if(v.vessel_type) fields.vessel_type = v.vessel_type
                  if(v.gt)          fields.gt          = v.gt
                  if(v.dwt)         fields.dwt         = v.dwt
                  if(v.loa)         fields.loa         = v.loa
                  if(v.beam)        fields.beam        = v.beam
                  if(v.year_built)  fields.year_built  = v.year_built
                  // Update local state
                  setForm(f => ({ ...f, ...fields }))
                  // Also save immediately to DB so it's not lost
                  if (Object.keys(fields).length > 0) {
                    await supabase.from('operations').update(fields).eq('id', operation.id)
                    onSaved()
                  }
                }}/>
              </div>
              <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.op_date||''} onChange={e=>set('op_date',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETA</label><input type="date" value={form.eta||''} onChange={e=>set('eta',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETB</label><input type="date" value={form.etb||''} onChange={e=>set('etb',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETD</label><input type="date" value={form.etd||''} onChange={e=>set('etd',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Port</label><input value={form.port||''} onChange={e=>set('port',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Sub-Agent</label><input value={form.sub_agent||''} onChange={e=>set('sub_agent',e.target.value)}/></div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Account / Principal</label><input value={form.client_name||''} onChange={e=>set('client_name',e.target.value)}/></div>
            </div>

            <div className="section-title">Vessel identifiers</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div className="form-group"><label className="form-label">IMO</label><input value={form.imo||''} onChange={e=>set('imo',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">MMSI</label><input value={form.mmsi||''} onChange={e=>set('mmsi',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
            </div>

            <div className="section-title">Financials</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select value={form.inv_currency||'EUR'} onChange={e=>set('inv_currency',e.target.value)}>
                  <option value="EUR">EUR €</option><option value="USD">USD $</option><option value="GBP">GBP £</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Add. services</label>
                <select value={form.add_services?'true':'false'} onChange={e=>set('add_services',e.target.value==='true')}>
                  <option value="false">No</option><option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Invoice Out</label><input type="number" step="0.01" value={form.inv_out||''} onChange={e=>set('inv_out',e.target.value?Number(e.target.value):null)} placeholder="0.00"/></div>
              <div className="form-group"><label className="form-label">Invoice In</label><input type="number" step="0.01" value={form.inv_in||''} onChange={e=>set('inv_in',e.target.value?Number(e.target.value):null)} placeholder="0.00"/></div>
              <div className="form-group"><label className="form-label">Income Local</label><input type="number" step="0.01" value={form.income_local||''} onChange={e=>set('income_local',e.target.value?Number(e.target.value):null)} placeholder="0.00"/></div>
              <div className="form-group"><label className="form-label">Income EUR</label><input type="number" step="0.01" value={form.income_eur||''} onChange={e=>set('income_eur',e.target.value?Number(e.target.value):null)} placeholder="0.00"/></div>
              {(form.inv_out || form.inv_in) ? (
                <div style={{ gridColumn:'1/-1', background:'var(--bg)', padding:'10px 14px', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Net (inv out − inv in)</span>
                  <span style={{ fontWeight:700, color:net>=0?'var(--green)':'var(--red)', fontSize:'0.95rem' }}>{formatMoney(net, form.inv_currency)}</span>
                </div>
              ) : null}
            </div>

            <div className="section-title">Cargo details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              <div className="form-group"><label className="form-label">Commodity</label><input value={form.commodity||''} onChange={e=>set('commodity',e.target.value)} placeholder="Wheat, Clinker…"/></div>
              <div className="form-group"><label className="form-label">Quantity</label><input value={form.quantity||''} onChange={e=>set('quantity',e.target.value)} placeholder="23,998 MTS."/></div>
              <div className="form-group"><label className="form-label">Commodity 2</label><input value={form.commodity_2||''} onChange={e=>set('commodity_2',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Quantity 2</label><input value={form.quantity_2||''} onChange={e=>set('quantity_2',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Terms</label><input value={form.cargo_terms||''} onChange={e=>set('cargo_terms',e.target.value)} placeholder="FREE OUT…"/></div>
              <div className="form-group"><label className="form-label">Vessel Type</label><input value={form.vessel_type||''} onChange={e=>set('vessel_type',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Call Sign</label><input value={form.call_sign||''} onChange={e=>set('call_sign',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">Flag</label><input value={form.flag||''} onChange={e=>set('flag',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">GT</label><input value={form.gt||''} onChange={e=>set('gt',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">DWT</label><input value={form.dwt||''} onChange={e=>set('dwt',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">LOA</label><input value={form.loa||''} onChange={e=>set('loa',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">Beam</label><input value={form.beam||''} onChange={e=>set('beam',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group"><label className="form-label">Year Built</label><input value={form.year_built||''} onChange={e=>set('year_built',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
            </div>

            <div className="section-title">Operator</div>
            <div className="form-group" style={{ marginBottom:20 }}>
              <select value={form.operator||''} onChange={e=>set('operator',e.target.value)}>
                <option value="">— unassigned —</option>
                <option value="Nicolai Baden">Nicolai Baden</option>
                <option value="Romeo Baden">Romeo Baden</option>
              </select>
            </div>

            <div className="section-title">Notes</div>
            <div className="form-group" style={{ marginBottom:20 }}>
              <textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows={4}/>
            </div>

            {!confirm ? (
              <button onClick={() => setConfirm(true)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'0.8rem', cursor:'pointer', padding:'4px 0' }}>Delete this operation…</button>
            ) : (
              <div style={{ background:'var(--red-bg)', borderRadius:8, padding:'12px 14px' }}>
                <p style={{ color:'var(--red)', fontSize:'0.85rem', marginBottom:10 }}>Cannot be undone. Are you sure?</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={del} disabled={deleting} style={{ background:'var(--red)', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', cursor:'pointer', fontSize:'0.85rem' }}>{deleting?'Deleting…':'Yes, delete'}</button>
                  <button onClick={() => setConfirm(false)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', cursor:'pointer', fontSize:'0.85rem' }}>Cancel</button>
                </div>
              </div>
            )}
          </>) : (<>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input value={newLog} onChange={e=>setNewLog(e.target.value)}
                placeholder="Add update (e.g. Crew change completed…)"
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submitLog()}
                style={{ flex:1 }}/>
              <button onClick={submitLog} disabled={addingLog||!newLog.trim()} className="btn-primary btn-sm">{addingLog?'…':'Add'}</button>
            </div>
            {logs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:'0.85rem' }}>No updates yet.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:8, borderLeft:'3px solid var(--navy)' }}>
                    <div style={{ fontSize:'0.88rem' }}>{log.note}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:4 }}>{new Date(log.created_at).toLocaleString('en-GB')}</div>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>

        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, background:'var(--surface)' }}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ flex:1 }}>
            {saving ? 'Saving…' : '✓ Save changes'}
          </button>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>

      {showAIEmail && <AIEmailPanel operation={form} onClose={() => setShowAIEmail(false)} />}
    </>
  )
}
