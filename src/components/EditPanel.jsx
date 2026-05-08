import { useState, useEffect } from 'react'
import VesselSearch from './VesselSearch'
import { updateOperation, deleteOperation } from '../hooks/useOperations'
import { useOperationLogs } from '../hooks/usePortInfo'
import { OP_TYPES, VESSEL_STATUSES, ENTRY_STATUSES, formatDate, formatMoney } from '../lib/constants'

export default function EditPanel({ operation, onClose, onSaved }) {
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const [confirm, setConfirm]   = useState(false)
  const [newLog, setNewLog]     = useState('')
  const [addingLog, setAddingLog] = useState(false)
  const { logs, addLog, refetch: refetchLogs } = useOperationLogs(operation?.id)

  useEffect(() => { if (operation) setForm({...operation}) }, [operation])

  if (!operation) return null
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    setSaving(true); setError('')
    try {
      const {id,created_at,updated_at,created_by,updated_by,net,_tab,...rest} = form
      console.log("SAVING:", JSON.stringify(rest))
      await updateOperation(operation.id, rest)
      onSaved(); onClose()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
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
    if (form.mmsi) return window.open(`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${form.mmsi}`,'_blank')
    if (form.imo)  return window.open(`https://www.marinetraffic.com/en/ais/details/ships/imo:${form.imo}`,'_blank')
    const q = (form.vessel_name||'').replace(/^(MV|MT|MS|SS|SV)\s+/i,'').trim()
    window.open('https://www.marinetraffic.com/en/ais/index/search/all/keyword:' + q, '_blank')
  }

  const net = (form.inv_out||0)-(form.inv_in||0)

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,backdropFilter:'blur(2px)'}}/>
      <div style={{
        position:'fixed',top:0,right:0,bottom:0,
        width:'100%',maxWidth:520,
        background:'var(--surface)',zIndex:201,
        display:'flex',flexDirection:'column',
        boxShadow:'-4px 0 24px rgba(0,0,0,0.15)',
        animation:'slideIn 0.22s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',
          background:'var(--navy)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem',fontFamily:'var(--mono)'}}>{operation.ref}</div>
            <div style={{color:'#fff',fontWeight:600,fontSize:'0.95rem',marginTop:2}}>{operation.vessel_name||'—'}</div>
          </div>
          <button onClick={trackMT} style={{background:'rgba(255,255,255,0.15)',color:'#fff',
            border:'none',borderRadius:6,padding:'6px 12px',fontSize:'0.78rem',cursor:'pointer'}}>
            🚢 Track
          </button>
          <button onClick={onClose} style={{background:'transparent',color:'rgba(255,255,255,0.7)',
            border:'none',fontSize:'1.4rem',cursor:'pointer',lineHeight:1,padding:4}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
          {['Details','Activity log'].map((tab,i)=>{
            const [activeTab,setActiveTab_] = [form._tab||0, v=>set('_tab',v)]
            return (
              <button key={tab} onClick={()=>set('_tab',i)}
                style={{flex:1,padding:'10px',border:'none',cursor:'pointer',fontSize:'0.85rem',fontWeight:500,
                  background:(form._tab||0)===i?'var(--surface)':'transparent',
                  color:(form._tab||0)===i?'var(--navy)':'var(--muted)',
                  borderBottom:(form._tab||0)===i?'2px solid var(--navy)':'2px solid transparent',
                }}>
                {tab} {tab==='Activity log' && logs.length>0 ? `(${logs.length})` : ''}
              </button>
            )
          })}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20}}>
          {error && <div style={{background:'var(--red-bg)',color:'var(--red)',
            padding:'10px 14px',borderRadius:8,fontSize:'0.85rem',marginBottom:16}}>{error}</div>}

          {(form._tab||0)===0 ? (
            <>
              {/* Status */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Vessel Name</label>
                  <input value={form.vessel_name||''} onChange={e=>set('vessel_name',e.target.value)} style={{marginBottom:6}}/>
                  <VesselSearch
                    value={''}
                    onChange={() => {}}
                    onVesselSelect={({name,imo,mmsi,call_sign,flag,vessel_type,gt,dwt,loa,beam,year_built}) => {
                      if (name)        set('vessel_name', name)
                      if (imo)         set('imo', imo)
                      if (mmsi)        set('mmsi', mmsi)
                      if (call_sign)   set('call_sign', call_sign)
                      if (flag)        set('flag', flag)
                      if (vessel_type) set('vessel_type', vessel_type)
                      if (gt)          set('gt', gt)
                      if (dwt)         set('dwt', dwt)
                      if (loa)         set('loa', loa)
                      if (beam)        set('beam', beam)
                      if (year_built)  set('year_built', year_built)
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" value={form.op_date||''} onChange={e=>set('op_date',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">ETA</label>
                  <input type="date" value={form.eta||''} onChange={e=>set('eta',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">ETB</label>
                  <input type="date" value={form.etb||''} onChange={e=>set('etb',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">ETD</label>
                  <input type="date" value={form.etd||''} onChange={e=>set('etd',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input value={form.port||''} onChange={e=>set('port',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Sub-Agent</label>
                  <input value={form.sub_agent||''} onChange={e=>set('sub_agent',e.target.value)}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Account / Principal</label>
                  <input value={form.client_name||''} onChange={e=>set('client_name',e.target.value)}/>
                </div>
              </div>

              <div className="section-title">Vessel identifiers</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div className="form-group">
                  <label className="form-label">IMO</label>
                  <input value={form.imo||''} onChange={e=>set('imo',e.target.value)}
                    style={{fontFamily:'var(--mono)'}} placeholder="e.g. 9876543"/>
                </div>
                <div className="form-group">
                  <label className="form-label">MMSI</label>
                  <input value={form.mmsi||''} onChange={e=>set('mmsi',e.target.value)}
                    style={{fontFamily:'var(--mono)'}} placeholder="e.g. 123456789"/>
                </div>
              </div>

              <div className="section-title">Financials</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select value={form.inv_currency||'EUR'} onChange={e=>set('inv_currency',e.target.value)}>
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
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
                  <input type="number" step="0.01" value={form.inv_out||''}
                    onChange={e=>set('inv_out',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice In</label>
                  <input type="number" step="0.01" value={form.inv_in||''}
                    onChange={e=>set('inv_in',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Income Local</label>
                  <input type="number" step="0.01" value={form.income_local||''}
                    onChange={e=>set('income_local',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Income EUR</label>
                  <input type="number" step="0.01" value={form.income_eur||''}
                    onChange={e=>set('income_eur',e.target.value?Number(e.target.value):null)} placeholder="0.00"/>
                </div>
                {(form.inv_out||form.inv_in) && (
                  <div style={{gridColumn:'1/-1',background:'var(--bg)',padding:'10px 14px',
                    borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'0.82rem',color:'var(--muted)'}}>Net (inv out − inv in)</span>
                    <span style={{fontWeight:700,color:net>=0?'var(--green)':'var(--red)',fontSize:'0.95rem'}}>
                      {formatMoney(net,form.inv_currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="section-title">Cargo details</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div className="form-group">
                  <label className="form-label">Commodity</label>
                  <input value={form.commodity||''} onChange={e=>set('commodity',e.target.value)} placeholder="Wheat, Clinker…"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input value={form.quantity||''} onChange={e=>set('quantity',e.target.value)} placeholder="23,998 MTS."/>
                </div>
                <div className="form-group">
                  <label className="form-label">Terms</label>
                  <input value={form.cargo_terms||''} onChange={e=>set('cargo_terms',e.target.value)} placeholder="FREE OUT…"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Vessel Type</label>
                  <input value={form.vessel_type||''} onChange={e=>set('vessel_type',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Call Sign</label>
                  <input value={form.call_sign||''} onChange={e=>set('call_sign',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Flag</label>
                  <input value={form.flag||''} onChange={e=>set('flag',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">GT</label>
                  <input value={form.gt||''} onChange={e=>set('gt',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">DWT</label>
                  <input value={form.dwt||''} onChange={e=>set('dwt',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">LOA</label>
                  <input value={form.loa||''} onChange={e=>set('loa',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Beam</label>
                  <input value={form.beam||''} onChange={e=>set('beam',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Year Built</label>
                  <input value={form.year_built||''} onChange={e=>set('year_built',e.target.value)} style={{fontFamily:'var(--mono)'}}/>
                </div>
              </div>
              <div className="section-title">Operator</div>
              <div className="form-group" style={{marginBottom:20}}>
                <select value={form.operator||''} onChange={e=>set('operator',e.target.value)}>
                  <option value="">— unassigned —</option>
                  <option value="Nicolai Baden">Nicolai Baden</option>
                  <option value="Romeo Baden">Romeo Baden</option>
                </select>
              </div>
              <div className="section-title">Notes</div>
              <div className="form-group" style={{marginBottom:20}}>
                <textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows={4}/>
              </div>

              {!confirm ? (
                <button onClick={()=>setConfirm(true)}
                  style={{background:'none',border:'none',color:'var(--muted)',fontSize:'0.8rem',cursor:'pointer',padding:'4px 0'}}>
                  Delete this operation…
                </button>
              ) : (
                <div style={{background:'var(--red-bg)',borderRadius:8,padding:'12px 14px'}}>
                  <p style={{color:'var(--red)',fontSize:'0.85rem',marginBottom:10}}>Cannot be undone. Are you sure?</p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={del} disabled={deleting}
                      style={{background:'var(--red)',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',cursor:'pointer',fontSize:'0.85rem'}}>
                      {deleting?'Deleting…':'Yes, delete'}
                    </button>
                    <button onClick={()=>setConfirm(false)}
                      style={{background:'none',border:'1px solid var(--border)',borderRadius:6,padding:'8px 16px',cursor:'pointer',fontSize:'0.85rem'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Activity log tab */
            <>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <input value={newLog} onChange={e=>setNewLog(e.target.value)}
                  placeholder="Add update (e.g. Crew change completed, Cargo loaded…)"
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submitLog()}
                  style={{flex:1}}/>
                <button onClick={submitLog} disabled={addingLog||!newLog.trim()}
                  className="btn-primary btn-sm">
                  {addingLog?'…':'Add'}
                </button>
              </div>
              {logs.length===0 ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)',fontSize:'0.85rem'}}>
                  No updates yet. Add the first one above.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {logs.map(log=>(
                    <div key={log.id} style={{
                      padding:'10px 14px',background:'var(--bg)',
                      borderRadius:8,borderLeft:'3px solid var(--navy)',
                    }}>
                      <div style={{fontSize:'0.88rem'}}>{log.note}</div>
                      <div style={{fontSize:'0.72rem',color:'var(--muted)',marginTop:4}}>
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',
          display:'flex',gap:10,background:'var(--surface)'}}>
          {(form._tab||0)===0 && (
            <button onClick={save} disabled={saving} className="btn-primary" style={{flex:1}}>
              {saving?'Saving…':'✓ Save changes'}
            </button>
          )}
          <button onClick={onClose} className="btn-secondary" style={(form._tab||0)===1?{flex:1}:{}}>Close</button>
        </div>
      </div>
    </>
  )
}
