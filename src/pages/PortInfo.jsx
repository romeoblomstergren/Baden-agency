import { useState } from 'react'
import { usePortInfo, savePortInfo, deletePortInfo } from '../hooks/usePortInfo'

const BLANK = {
  port_name:'', country:'', commodity:'', operation:'',
  max_draft:'', max_loa:'', max_beam:'', max_air_draft:'',
  water_density:'', pilotage:'', tugs:'', working_hours:'',
  discharge_rate:'', discharge_method:'', crane_info:'',
  health_protocol:'', isps_marsec:'', marpol_notes:'',
  ballast_water:'', tidal_info:'', rainy_season:'',
  restrictions:'', full_brief:'', last_updated:'', updated_by_name:'',
}

export default function PortInfo() {
  const [search, setSearch]   = useState('')
  const [opFilter, setOpFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState(BLANK)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const { data, loading, refetch } = usePortInfo({ search, operation: opFilter||undefined })

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const openNew = () => { setForm(BLANK); setSelected(null); setEditing(true) }
  const openEdit = (item) => { setForm({...item}); setSelected(item); setEditing(true) }
  const closeEdit = () => { setEditing(false); setSelected(null); setError('') }

  const save = async () => {
    if (!form.port_name) { setError('Port name is required'); return }
    setSaving(true); setError('')
    try {
      const { id, created_at, updated_at, created_by, ...rest } = form
      await savePortInfo(rest, selected?.id)
      refetch(); closeEdit()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this port brief? Cannot be undone.')) return
    await deletePortInfo(id)
    refetch(); if (selected?.id===id) closeEdit()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Port Information</h1>
          <p style={{color:'var(--muted)',fontSize:'0.82rem',marginTop:2}}>
            Port & commodity briefs — operational info for your team
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={openNew}>+ New brief</button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <input placeholder="Search port, country, commodity…"
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:180}} />
        <select value={opFilter} onChange={e=>setOpFilter(e.target.value)} style={{width:'auto'}}>
          <option value="">Loading & Discharging</option>
          <option value="Loading">Loading</option>
          <option value="Discharging">Discharging</option>
        </select>
      </div>

      {loading ? <div className="spinner"/> : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {data.length===0 && (
            <div className="empty card">
              <div className="empty-icon">🗂️</div>
              <p>No port briefs yet.</p>
              <p style={{fontSize:'0.8rem',marginTop:6}}>Click "New brief" to add your first one.</p>
            </div>
          )}
          {data.map(item=>(
            <div key={item.id} className="card" style={{padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:'1rem'}}>{item.port_name}</span>
                    {item.country && <span style={{color:'var(--muted)',fontSize:'0.85rem'}}>{item.country}</span>}
                    {item.commodity && (
                      <span style={{background:'var(--navy)',color:'#fff',
                        fontSize:'0.72rem',fontWeight:600,padding:'2px 8px',borderRadius:4}}>
                        {item.commodity}
                      </span>
                    )}
                    {item.operation && (
                      <span style={{
                        background: item.operation==='Loading'?'var(--green-bg)':'var(--amber-bg)',
                        color: item.operation==='Loading'?'var(--green)':'var(--amber)',
                        fontSize:'0.72rem',fontWeight:600,padding:'2px 8px',borderRadius:4
                      }}>{item.operation}</span>
                    )}
                  </div>

                  {/* Key specs row */}
                  <div style={{display:'flex',gap:20,flexWrap:'wrap',fontSize:'0.82rem',color:'var(--muted)',marginBottom:8}}>
                    {item.max_draft && <span>⚓ Draft: <strong style={{color:'var(--text)'}}>{item.max_draft}</strong></span>}
                    {item.max_loa   && <span>📏 LOA: <strong style={{color:'var(--text)'}}>{item.max_loa}</strong></span>}
                    {item.pilotage  && <span>🧭 Pilotage: <strong style={{color:'var(--text)'}}>{item.pilotage}</strong></span>}
                    {item.discharge_rate && <span>📦 Rate: <strong style={{color:'var(--text)'}}>{item.discharge_rate}</strong></span>}
                  </div>

                  {item.restrictions && (
                    <div style={{background:'var(--amber-bg)',color:'var(--amber)',
                      padding:'6px 10px',borderRadius:6,fontSize:'0.78rem',marginBottom:8}}>
                      ⚠️ {item.restrictions}
                    </div>
                  )}

                  {item.last_updated && (
                    <div style={{fontSize:'0.72rem',color:'var(--muted)'}}>
                      Updated {item.last_updated}{item.updated_by_name ? ` · ${item.updated_by_name}` : ''}
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <button className="btn-secondary btn-sm" onClick={()=>openEdit(item)}>Edit</button>
                  <button onClick={()=>del(item.id)}
                    style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:'6px 8px',fontSize:'0.85rem'}}>
                    🗑
                  </button>
                </div>
              </div>

              {/* Full brief expandable */}
              {item.full_brief && (
                <details style={{marginTop:12}}>
                  <summary style={{cursor:'pointer',fontSize:'0.82rem',color:'var(--blue)',userSelect:'none'}}>
                    View full brief ▾
                  </summary>
                  <pre style={{
                    marginTop:10,padding:'14px',background:'var(--bg)',
                    borderRadius:8,fontSize:'0.78rem',lineHeight:1.7,
                    whiteSpace:'pre-wrap',wordBreak:'break-word',
                    fontFamily:'var(--mono)',color:'var(--text)',
                    border:'1px solid var(--border)',
                  }}>{item.full_brief}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit / New panel */}
      {editing && (
        <>
          <div onClick={closeEdit} style={{
            position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,backdropFilter:'blur(2px)'
          }}/>
          <div style={{
            position:'fixed',top:0,right:0,bottom:0,
            width:'100%',maxWidth:600,
            background:'var(--surface)',zIndex:201,
            display:'flex',flexDirection:'column',
            boxShadow:'-4px 0 24px rgba(0,0,0,0.15)',
            animation:'slideIn 0.22s ease',
          }}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',
              background:'var(--navy)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{color:'rgba(255,255,255,0.6)',fontSize:'0.72rem'}}>Port Information</div>
                <div style={{color:'#fff',fontWeight:600,fontSize:'0.95rem',marginTop:2}}>
                  {selected ? `${selected.port_name} — ${selected.commodity||'General'}` : 'New port brief'}
                </div>
              </div>
              <button onClick={closeEdit} style={{background:'transparent',color:'rgba(255,255,255,0.7)',
                border:'none',fontSize:'1.4rem',cursor:'pointer',lineHeight:1,padding:4}}>×</button>
            </div>

            {/* Form */}
            <div style={{flex:1,overflowY:'auto',padding:20}}>
              {error && <div style={{background:'var(--red-bg)',color:'var(--red)',
                padding:'10px 14px',borderRadius:8,fontSize:'0.85rem',marginBottom:16}}>{error}</div>}

              <div className="section-title">Identity</div>
              <div className="form-grid" style={{marginBottom:16}}>
                <div className="form-group">
                  <label className="form-label">Port name *</label>
                  <input value={form.port_name} onChange={e=>set('port_name',e.target.value)} placeholder="Tema"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Ghana"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Commodity</label>
                  <input value={form.commodity} onChange={e=>set('commodity',e.target.value)} placeholder="Clinker, Wheat, General…"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Operation</label>
                  <select value={form.operation} onChange={e=>set('operation',e.target.value)}>
                    <option value="">Both</option>
                    <option value="Loading">Loading</option>
                    <option value="Discharging">Discharging</option>
                  </select>
                </div>
              </div>

              <div className="section-title">Restrictions</div>
              <div className="form-grid" style={{marginBottom:16}}>
                {[['max_draft','Max draft'],['max_loa','Max LOA'],['max_beam','Max beam'],
                  ['max_air_draft','Max air draft'],['water_density','Water density']].map(([k,l])=>(
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input value={form[k]} onChange={e=>set(k,e.target.value)}/>
                  </div>
                ))}
              </div>

              <div className="section-title">Navigation</div>
              <div className="form-grid" style={{marginBottom:16}}>
                {[['pilotage','Pilotage'],['tugs','Tug assistance'],['tidal_info','Tidal info'],['rainy_season','Rainy season']].map(([k,l])=>(
                  <div key={k} className="form-group form-full">
                    <label className="form-label">{l}</label>
                    <input value={form[k]} onChange={e=>set(k,e.target.value)}/>
                  </div>
                ))}
              </div>

              <div className="section-title">Operations</div>
              <div className="form-grid" style={{marginBottom:16}}>
                {[['working_hours','Working hours'],['discharge_rate','Discharge/loading rate'],
                  ['discharge_method','Method'],['crane_info','Cranes']].map(([k,l])=>(
                  <div key={k} className="form-group form-full">
                    <label className="form-label">{l}</label>
                    <input value={form[k]} onChange={e=>set(k,e.target.value)}/>
                  </div>
                ))}
              </div>

              <div className="section-title">Compliance & Health</div>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
                {[['health_protocol','Health protocol'],['isps_marsec','ISPS / MARSEC'],
                  ['marpol_notes','MARPOL notes'],['ballast_water','Ballast water']].map(([k,l])=>(
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <textarea value={form[k]} onChange={e=>set(k,e.target.value)} rows={2}/>
                  </div>
                ))}
              </div>

              <div className="section-title">General restrictions / notes</div>
              <div className="form-group" style={{marginBottom:16}}>
                <textarea value={form.restrictions} onChange={e=>set('restrictions',e.target.value)} rows={3}
                  placeholder="Max draft, LOA, berth info, first come first served, etc."/>
              </div>

              <div className="section-title">Full brief (paste complete port brief here)</div>
              <div className="form-group" style={{marginBottom:16}}>
                <textarea value={form.full_brief} onChange={e=>set('full_brief',e.target.value)} rows={14}
                  placeholder="Paste the full port & operational brief here…"
                  style={{fontFamily:'var(--mono)',fontSize:'0.78rem',lineHeight:1.6}}/>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Last updated</label>
                  <input type="date" value={form.last_updated} onChange={e=>set('last_updated',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Updated by</label>
                  <input value={form.updated_by_name} onChange={e=>set('updated_by_name',e.target.value)} placeholder="Your name"/>
                </div>
              </div>
            </div>

            <div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',
              display:'flex',gap:10,background:'var(--surface)'}}>
              <button onClick={save} disabled={saving} className="btn-primary" style={{flex:1}}>
                {saving?'Saving…':'✓ Save brief'}
              </button>
              <button onClick={closeEdit} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
