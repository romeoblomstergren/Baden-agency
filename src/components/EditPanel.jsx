import { useState, useEffect } from 'react'
import VesselSearch from './VesselSearch'
import VesselCompliance from './VesselCompliance'
import { deleteOperation } from '../hooks/useOperations'
import { useOperationLogs } from '../hooks/usePortInfo'
import { useAI } from '../hooks/useAI'
import { supabase } from '../lib/supabase'
import { VESSEL_STATUSES, ENTRY_STATUSES, formatDate, formatMoney } from '../lib/constants'

const EMAIL_TYPES = [
  { label: 'Port Agency Appointment', value: 'appointment' },
  { label: 'ETA Notification',        value: 'eta'         },
  { label: 'OPA Letter',              value: 'opa'         },
  { label: 'NOR Tender',              value: 'nor'         },
  { label: 'Proforma DA',             value: 'proforma'    },
  { label: 'ETD / Departure Notice',  value: 'etd'         },
]

const COMMODITIES = [
  'Wheat','Corn','Barley','Soya Beans','Soya Meal','Rice','Millet','Sorghum',
  'Clinker','Cement','Limestone','Gypsum',
  'Fertilizer','Urea','DAP','MAP','Potash',
  'Coal','Petroleum Coke',
  'Steel','Iron Ore','Scrap Metal','Pig Iron',
  'Sugar','Salt','Wood Pellets',
  'General Cargo','Containers','Project Cargo',
]

const CARGO_TERMS = [
  'FREE IN','FREE OUT','FREE IN/OUT','FREE IN/OUT AND STOWED',
  'FIOS','FIOST','LINER TERMS','GROSS TERMS',
  'CIF','FOB','CFR','EXW',
]

const VESSEL_TYPES = [
  'Bulk Carrier','Handysize Bulk Carrier','Handymax Bulk Carrier',
  'Supramax Bulk Carrier','Panamax Bulk Carrier','Capesize Bulk Carrier',
  'General Cargo','MPP','Container Ship',
  'Oil Tanker','Chemical Tanker','LPG Tanker','LNG Tanker',
  'Product Tanker','VLCC','Aframax','Suezmax',
  'RoRo','Car Carrier','Livestock Carrier',
  'Offshore Supply Vessel','Tug','Dredger',
]

const FLAGS = [
  'Panama','Liberia','Marshall Islands','Bahamas','Singapore',
  'Malta','Cyprus','Greece','Norway','Denmark','Netherlands',
  'United Kingdom','Germany','Japan','China','South Korea',
  'Italy','France','Spain','Portugal','Turkey',
  'Cook Islands','Antigua & Barbuda','Saint Kitts & Nevis',
  'Cayman Islands','Gibraltar','Isle of Man',
]

// Combobox — dropdown with free-text fallback
function Combobox({ value, onChange, options, placeholder, mono }) {
  const [custom, setCustom] = useState(!options.includes(value) && value ? value : '')
  const isCustom = value && !options.includes(value)

  return (
    <div>
      <select value={isCustom ? '__custom__' : (value || '')} onChange={e => {
        if (e.target.value === '__custom__') { onChange(custom); }
        else { onChange(e.target.value); setCustom('') }
      }} style={{ marginBottom: isCustom ? 6 : 0, fontFamily: mono ? 'var(--mono)' : undefined }}>
        <option value="">{placeholder || '— select —'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">✏️ Enter manually…</option>
      </select>
      {isCustom && (
        <input value={value} onChange={e => { onChange(e.target.value); setCustom(e.target.value) }}
          placeholder="Type value…" style={{ fontFamily: mono ? 'var(--mono)' : undefined }} />
      )}
    </div>
  )
}

function AIEmailPanel({ operation, onClose }) {
  const [type, setType]     = useState('appointment')
  const [draft, setDraft]   = useState('')
  const [copied, setCopied] = useState(false)
  const { ask, loading }    = useAI()

  const SYSTEM = `You are a professional shipping agency email writer for Baden Agency.
Write formal, concise maritime emails. Always include: Subject line, proper salutation, professional body, and sign-off with "Baden Agency".
Use correct maritime terminology. Be specific with vessel details provided.`

  const prompts = {
    appointment: `Write a port agency appointment letter for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETA: ${operation.eta ? formatDate(operation.eta) : 'TBC'}\nRef: ${operation.ref}`,
    eta:         `Write an ETA notification email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETA: ${operation.eta ? formatDate(operation.eta) : 'TBC'}\nRef: ${operation.ref}`,
    opa:         `Write an OPA appointment letter for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nRef: ${operation.ref}`,
    nor:         `Write a NOR tender email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nCommodity: ${operation.commodity || 'cargo'}\nETB: ${operation.etb ? formatDate(operation.etb) : 'TBC'}\nRef: ${operation.ref}`,
    proforma:    `Write a proforma DA covering email for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nRef: ${operation.ref}`,
    etd:         `Write a departure/ETD notification for:\nVessel: ${operation.vessel_name}\nPort: ${operation.port}\nPrincipal: ${operation.client_name}\nETD: ${operation.etd ? formatDate(operation.etd) : 'TBC'}\nRef: ${operation.ref}`,
  }

  async function generate() {
    setDraft('')
    const result = await ask(prompts[type], { system: SYSTEM, max_tokens: 1000 })
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
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, backdropFilter:'blur(2px)' }} />
      <div style={{ position:'fixed', top:'5%', left:'50%', transform:'translateX(-50%)', zIndex:301, width:'90%', maxWidth:580, background:'var(--surface)', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', maxHeight:'90vh', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--navy)', display:'flex', alignItems:'center', gap:12, borderRadius:'16px 16px 0 0' }}>
          <span style={{ color:'var(--blue)', fontSize:'1rem' }}>✦</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff', fontWeight:600, fontSize:'0.9rem' }}>AI Email Drafter</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.72rem' }}>{operation.vessel_name} · {operation.ref}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', color:'rgba(255,255,255,0.7)', border:'none', fontSize:'1.4rem', cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:20, flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {EMAIL_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                style={{ padding:'6px 12px', borderRadius:20, fontSize:'0.78rem', fontWeight:600, cursor:'pointer', border:'1px solid var(--border)', background:type===t.value?'var(--navy)':'var(--bg)', color:type===t.value?'#fff':'var(--muted)', transition:'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary btn-sm" style={{ marginBottom:16 }}>
            {loading ? '◌ Generating…' : '✦ Generate email'}
          </button>
          {draft && (
            <>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16}
                style={{ width:'100%', fontFamily:'var(--mono)', fontSize:'0.78rem', lineHeight:1.6, resize:'vertical', boxSizing:'border-box' }} />
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
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

const TABS = ['Details', 'Vessel', 'Cargo', 'Financials', 'Log', '🌿']

export default function EditPanel({ operation, onClose, onSaved }) {
  const [form, setForm]             = useState({})
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState('')
  const [confirm, setConfirm]       = useState(false)
  const [newLog, setNewLog]         = useState('')
  const [addingLog, setAddingLog]   = useState(false)
  const [showAIEmail, setShowAIEmail] = useState(false)
  const [activeTab, setActiveTab]   = useState(0)
  const { logs, addLog }            = useOperationLogs(operation?.id)

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
        if (key in form) payload[key] = form[key] === '' ? null : (form[key] ?? null)
      }
      const { error: dbError } = await supabase
        .from('operations')
        .update(payload)
        .eq('id', operation.id)
      if (dbError) throw new Error(dbError.message)
      onSaved()
      onClose()
    } catch(e) {
      setError(e.message || 'Save failed')
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

  const net = (Number(form.inv_out) || 0) - (Number(form.inv_in) || 0)

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'100%', maxWidth:560, background:'var(--surface)', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', animation:'slideIn 0.22s ease' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--navy)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.7rem', fontFamily:'var(--mono)' }}>{operation.ref}</div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:'0.95rem', marginTop:1 }}>{form.vessel_name || '—'}</div>
          </div>
          <button onClick={() => setShowAIEmail(true)} style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer' }}>✦ Email</button>
          <button onClick={trackMT} style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer' }}>🚢 Track</button>
          <button onClick={onClose} style={{ background:'transparent', color:'rgba(255,255,255,0.7)', border:'none', fontSize:'1.4rem', cursor:'pointer', lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg)', overflowX:'auto', flexShrink:0 }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              style={{ flex:1, minWidth:52, padding:'9px 6px', border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:500, whiteSpace:'nowrap',
                background: activeTab===i ? 'var(--surface)' : 'transparent',
                color: activeTab===i ? 'var(--navy)' : 'var(--muted)',
                borderBottom: activeTab===i ? '2px solid var(--navy)' : '2px solid transparent' }}>
              {tab}{tab==='Log' && logs.length > 0 ? ` (${logs.length})` : ''}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {error && <div style={{ background:'var(--red-bg)', color:'var(--red)', padding:'10px 14px', borderRadius:8, fontSize:'0.85rem', marginBottom:16 }}>{error}</div>}

          {/* ── TAB 0: Details ── */}
          {activeTab === 0 && (<>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
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

            <div className="section-title">Dates & port</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group"><label className="form-label">Op Date</label><input type="date" value={form.op_date||''} onChange={e=>set('op_date',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETA</label><input type="date" value={form.eta||''} onChange={e=>set('eta',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETB</label><input type="date" value={form.etb||''} onChange={e=>set('etb',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">ETD</label><input type="date" value={form.etd||''} onChange={e=>set('etd',e.target.value)}/></div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Port</label><input value={form.port||''} onChange={e=>set('port',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Sub-Agent</label><input value={form.sub_agent||''} onChange={e=>set('sub_agent',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Operator</label>
                <select value={form.operator||''} onChange={e=>set('operator',e.target.value)}>
                  <option value="">— unassigned —</option>
                  <option value="Nicolai Baden">Nicolai Baden</option>
                  <option value="Romeo Baden">Romeo Baden</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Principal / Account</label><input value={form.client_name||''} onChange={e=>set('client_name',e.target.value)}/></div>
            </div>

            <div className="section-title">Notes</div>
            <div className="form-group" style={{ marginBottom:16 }}>
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
          </>)}

          {/* ── TAB 1: Vessel ── */}
          {activeTab === 1 && (<>
            <div className="section-title" style={{ marginTop:0 }}>Search & autofill</div>
            <div className="form-group" style={{ marginBottom:16 }}>
              <label className="form-label">Vessel Name</label>
              <input value={form.vessel_name||''} onChange={e=>set('vessel_name',e.target.value)} style={{ marginBottom:6 }}/>
              <VesselSearch value="" onChange={()=>{}} onVesselSelect={async v => {
                const val = x => (x !== undefined && x !== null && x !== '') ? x : null
                const fields = {
                  vessel_name: val(v.name),  imo: val(v.imo),
                  mmsi: val(v.mmsi),         call_sign: val(v.call_sign),
                  flag: val(v.flag),         vessel_type: val(v.vessel_type),
                  gt: val(v.gt),             dwt: val(v.dwt),
                  loa: val(v.loa),           beam: val(v.beam),
                  year_built: val(v.year_built),
                }
                const toSave = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== null))
                setForm(f => ({ ...f, ...toSave }))
                if (operation?.id && Object.keys(toSave).length > 0) {
                  const { error } = await supabase.from('operations').update(toSave).eq('id', operation.id)
                  if (error) console.error('Save error:', error)
                  else { console.log('Saved:', Object.keys(toSave)); onSaved() }
                }
                if (val(v.imo)) {
                  await supabase.from('vessels').upsert({
                    name: val(v.name)||'', imo: val(v.imo),
                    mmsi: val(v.mmsi), call_sign: val(v.call_sign),
                    flag: val(v.flag), vessel_type: val(v.vessel_type),
                    gt: val(v.gt), dwt: val(v.dwt), loa: val(v.loa),
                    beam: val(v.beam), year_built: val(v.year_built),
                  }, { onConflict: 'imo', ignoreDuplicates: false })
                }
                if (toSave.mmsi) {
                  fetch('/api/vessel-watch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mmsi: toSave.mmsi, action: 'add' }),
                  }).catch(() => {})
                }
              }}/>
            </div>

            <div className="section-title">Identifiers</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group">
                <label className="form-label">IMO</label>
                <input value={form.imo||''} onChange={e=>set('imo',e.target.value)}
                  onBlur={async e => {
                    const imo = e.target.value.trim()
                    if (imo && operation?.id) {
                      await supabase.from('operations').update({ imo }).eq('id', operation.id)
                      onSaved()
                    }
                  }}
                  style={{ fontFamily:'var(--mono)' }} placeholder="7-digit IMO"/>
              </div>
              <div className="form-group">
                <label className="form-label">MMSI</label>
                <input value={form.mmsi||''} onChange={e=>set('mmsi',e.target.value)}
                  onBlur={async e => {
                    const mmsi = e.target.value.trim()
                    if (mmsi && operation?.id) {
                      await supabase.from('operations').update({ mmsi }).eq('id', operation.id)
                      onSaved()
                      fetch('/api/vessel-watch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mmsi, action: 'add' }),
                      }).catch(() => {})
                    }
                  }}
                  style={{ fontFamily:'var(--mono)' }} placeholder="9-digit MMSI"/>
              </div>
              <div className="form-group"><label className="form-label">Call Sign</label><input value={form.call_sign||''} onChange={e=>set('call_sign',e.target.value)} style={{ fontFamily:'var(--mono)' }}/></div>
              <div className="form-group">
                <label className="form-label">Flag</label>
                <Combobox value={form.flag||''} onChange={v=>set('flag',v)} options={FLAGS} placeholder="Select flag…"/>
              </div>
            </div>

            <div className="section-title">Particulars</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Vessel Type</label>
                <Combobox value={form.vessel_type||''} onChange={v=>set('vessel_type',v)} options={VESSEL_TYPES} placeholder="Select type…"/>
              </div>
              <div className="form-group"><label className="form-label">GT</label><input value={form.gt||''} onChange={e=>set('gt',e.target.value)} style={{ fontFamily:'var(--mono)' }} placeholder="Gross Tonnage"/></div>
              <div className="form-group"><label className="form-label">DWT</label><input value={form.dwt||''} onChange={e=>set('dwt',e.target.value)} style={{ fontFamily:'var(--mono)' }} placeholder="Deadweight Tons"/></div>
              <div className="form-group"><label className="form-label">LOA (m)</label><input value={form.loa||''} onChange={e=>set('loa',e.target.value)} style={{ fontFamily:'var(--mono)' }} placeholder="Length Overall"/></div>
              <div className="form-group"><label className="form-label">Beam (m)</label><input value={form.beam||''} onChange={e=>set('beam',e.target.value)} style={{ fontFamily:'var(--mono)' }} placeholder="Breadth"/></div>
              <div className="form-group"><label className="form-label">Year Built</label><input value={form.year_built||''} onChange={e=>set('year_built',e.target.value)} style={{ fontFamily:'var(--mono)' }} placeholder="e.g. 2007"/></div>
            </div>
          </>)}

          {/* ── TAB 2: Cargo ── */}
          {activeTab === 2 && (<>
            <div className="section-title" style={{ marginTop:0 }}>Primary cargo</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Commodity</label>
                <Combobox value={form.commodity||''} onChange={v=>set('commodity',v)} options={COMMODITIES} placeholder="Select commodity…"/>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Quantity</label>
                <input value={form.quantity||''} onChange={e=>set('quantity',e.target.value)} placeholder="e.g. 23,998 MTS."/>
              </div>
            </div>

            <div className="section-title">Secondary cargo (optional)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Commodity 2</label>
                <Combobox value={form.commodity_2||''} onChange={v=>set('commodity_2',v)} options={COMMODITIES} placeholder="Select commodity…"/>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Quantity 2</label>
                <input value={form.quantity_2||''} onChange={e=>set('quantity_2',e.target.value)}/>
              </div>
            </div>

            <div className="section-title">Terms & conditions</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12, marginBottom:16 }}>
              <div className="form-group">
                <label className="form-label">Cargo Terms</label>
                <Combobox value={form.cargo_terms||''} onChange={v=>set('cargo_terms',v)} options={CARGO_TERMS} placeholder="Select terms…"/>
              </div>
            </div>
          </>)}

          {/* ── TAB 3: Financials ── */}
          {activeTab === 3 && (<>
            <div className="section-title" style={{ marginTop:0 }}>Invoice</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select value={form.inv_currency||'EUR'} onChange={e=>set('inv_currency',e.target.value)}>
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                  <option value="NOK">NOK kr</option>
                  <option value="DKK">DKK kr</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Add. services</label>
                <select value={form.add_services?'true':'false'} onChange={e=>set('add_services',e.target.value==='true')}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Out</label>
                <input type="number" step="0.01" value={form.inv_out||''} onChange={e=>set('inv_out',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice In</label>
                <input type="number" step="0.01" value={form.inv_in||''} onChange={e=>set('inv_in',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
              </div>
            </div>

            {(form.inv_out || form.inv_in) && (
              <div style={{ background: net >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', padding:'14px 18px', borderRadius:10, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginBottom:2 }}>Net (out − in)</div>
                  <div style={{ fontWeight:800, fontSize:'1.3rem', color: net>=0 ? 'var(--green)' : 'var(--red)' }}>{formatMoney(net, form.inv_currency)}</div>
                </div>
                <div style={{ textAlign:'right', fontSize:'0.78rem', color:'var(--muted)' }}>
                  <div>Out: {formatMoney(form.inv_out||0, form.inv_currency)}</div>
                  <div>In: {formatMoney(form.inv_in||0, form.inv_currency)}</div>
                </div>
              </div>
            )}

            <div className="section-title">Income</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group">
                <label className="form-label">Income Local</label>
                <input type="number" step="0.01" value={form.income_local||''} onChange={e=>set('income_local',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Income EUR</label>
                <input type="number" step="0.01" value={form.income_eur||''} onChange={e=>set('income_eur',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
              </div>
            </div>

            {form.add_services && (<>
              <div className="section-title">Additional services</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Service description</label>
                  <input value={form.add_services_info||''} onChange={e=>set('add_services_info',e.target.value)} placeholder="Describe additional services…"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Add. Invoice Out</label>
                  <input type="number" step="0.01" value={form.add_inv_out||''} onChange={e=>set('add_inv_out',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Add. Invoice In</label>
                  <input type="number" step="0.01" value={form.add_inv_in||''} onChange={e=>set('add_inv_in',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
              </div>
            </>)}
          </>)}

          {/* ── TAB 4: Activity Log ── */}
          {activeTab === 4 && (<>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input value={newLog} onChange={e=>setNewLog(e.target.value)}
                placeholder="Add update (e.g. Vessel berthed at 0800 LT)"
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submitLog()}
                style={{ flex:1 }}/>
              <button onClick={submitLog} disabled={addingLog||!newLog.trim()} className="btn-primary btn-sm">{addingLog?'…':'Add'}</button>
            </div>
            {logs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:'0.85rem' }}>No updates yet.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:8, borderLeft:'3px solid var(--navy)' }}>
                    <div style={{ fontSize:'0.88rem' }}>{log.note}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:4 }}>{new Date(log.created_at).toLocaleString('en-GB')}</div>
                  </div>
                ))}
              </div>
            )}
          </>)}

          {/* ── TAB 5: Compliance ── */}
          {activeTab === 5 && (
            <VesselCompliance mmsi={form.mmsi} imo={form.imo} />
          )}
        </div>

        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, background:'var(--surface)', flexShrink:0 }}>
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
