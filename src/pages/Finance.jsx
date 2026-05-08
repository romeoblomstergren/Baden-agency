import { useState } from 'react'
import { useOperations } from '../hooks/useOperations'
import { formatMoney, OP_TYPES, MONTHS, CURRENT_YEAR } from '../lib/constants'

const YEARS = Array.from({length:7},(_,i)=>CURRENT_YEAR-i)

export default function Finance() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data: all, loading } = useOperations({ year, limit: 2000 })

  if (loading) return <div className="page"><div className="spinner"/></div>

  // Totals
  const totalOut = all.reduce((s,r)=>s+(r.inv_out||0),0)
  const totalIn  = all.reduce((s,r)=>s+(r.inv_in||0),0)
  const totalNet = all.reduce((s,r)=>s+(r.net||0),0)
  const outstanding = all.filter(r=>r.inv_out && !r.inv_in)
  const outstandingAmt = outstanding.reduce((s,r)=>s+(r.inv_out||0),0)

  // By op type
  const byType = OP_TYPES.map(t=>{
    const rows = all.filter(r=>r.op_type===t.code)
    return {
      code:t.code,label:t.label,count:rows.length,
      out:rows.reduce((s,r)=>s+(r.inv_out||0),0),
      net:rows.reduce((s,r)=>s+(r.net||0),0),
    }
  }).filter(t=>t.count>0).sort((a,b)=>b.net-a.net)

  // By client (top 10)
  const clientMap = {}
  all.forEach(r=>{
    if(!r.client_name) return
    if(!clientMap[r.client_name]) clientMap[r.client_name]={count:0,out:0,net:0}
    clientMap[r.client_name].count++
    clientMap[r.client_name].out+=(r.inv_out||0)
    clientMap[r.client_name].net+=(r.net||0)
  })
  const byClient = Object.entries(clientMap)
    .map(([name,v])=>({name,...v}))
    .sort((a,b)=>b.net-a.net).slice(0,10)

  // Monthly
  const byMonth = MONTHS.map((_,i)=>{
    const m = i+1
    const rows = all.filter(r=>r.op_date && new Date(r.op_date+'T00:00:00').getMonth()===i)
    return { month:MONTHS[i], out:rows.reduce((s,r)=>s+(r.inv_out||0),0), net:rows.reduce((s,r)=>s+(r.net||0),0) }
  })
  const maxNet = Math.max(...byMonth.map(m=>m.net),1)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Financial Overview</h1>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{width:'auto'}}>
          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Top metrics */}
      <div className="metrics" style={{marginBottom:20}}>
        <div className="metric">
          <div className="metric-label">Total invoiced out</div>
          <div className="metric-val" style={{fontSize:'1.3rem',color:'var(--navy)'}}>{formatMoney(totalOut)}</div>
          <div className="metric-sub">{all.length} operations</div>
        </div>
        <div className="metric">
          <div className="metric-label">Total income (net)</div>
          <div className="metric-val" style={{fontSize:'1.3rem',color:'var(--green)'}}>{formatMoney(totalNet)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Outstanding invoices</div>
          <div className="metric-val" style={{fontSize:'1.3rem',color:outstandingAmt>0?'var(--amber)':'var(--muted)'}}>
            {formatMoney(outstandingAmt)}
          </div>
          <div className="metric-sub">{outstanding.length} pending</div>
        </div>
        <div className="metric">
          <div className="metric-label">Costs (inv in)</div>
          <div className="metric-val" style={{fontSize:'1.3rem',color:'var(--muted)'}}>{formatMoney(totalIn)}</div>
        </div>
      </div>

      {/* Outstanding alert */}
      {outstanding.length > 0 && (
        <div className="card" style={{marginBottom:20,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',background:'var(--amber-bg)',
            borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:'0.88rem',color:'var(--amber)'}}>
            ⚠️ Outstanding invoices ({outstanding.length})
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ref</th><th>Vessel</th><th>Client</th><th>Date</th><th style={{textAlign:'right'}}>Inv out</th></tr></thead>
              <tbody>
                {outstanding.slice(0,10).map(r=>(
                  <tr key={r.id}>
                    <td><span className="ref">{r.ref}</span></td>
                    <td style={{fontWeight:500}}>{r.vessel_name||'—'}</td>
                    <td style={{color:'var(--muted)'}}>{r.client_name||'—'}</td>
                    <td style={{color:'var(--muted)'}}>{r.op_date||'—'}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:'var(--amber)'}}>
                      {formatMoney(r.inv_out,r.inv_currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly bar chart */}
      <div className="card" style={{marginBottom:20,padding:'16px 18px'}}>
        <div style={{fontWeight:600,fontSize:'0.88rem',marginBottom:16}}>Monthly net income — {year}</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
          {byMonth.map(m=>{
            const h = m.net>0 ? Math.max((m.net/maxNet)*100,3) : 0
            return (
              <div key={m.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:'0.65rem',color:'var(--muted)',fontWeight:600}}>
                  {m.net>0?formatMoney(m.net,'EUR').replace('€','').trim():''}
                </div>
                <div style={{
                  width:'100%',height:`${h}%`,minHeight:m.net>0?4:0,
                  background:m.net>0?'var(--green)':'var(--border)',
                  borderRadius:'3px 3px 0 0',
                  transition:'height 0.3s',
                }}/>
                <div style={{fontSize:'0.65rem',color:'var(--muted)'}}>{m.month}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
        {/* By op type */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',
            fontWeight:600,fontSize:'0.88rem'}}>By operation type</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Count</th><th style={{textAlign:'right'}}>Net</th></tr></thead>
              <tbody>
                {byType.map(t=>(
                  <tr key={t.code}>
                    <td><span style={{fontFamily:'var(--mono)',fontSize:'0.78rem',fontWeight:700,
                      background:'var(--navy)',color:'#fff',padding:'2px 7px',borderRadius:4}}>{t.code}</span></td>
                    <td style={{color:'var(--muted)'}}>{t.count}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:'var(--green)'}}>{formatMoney(t.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top clients */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',
            fontWeight:600,fontSize:'0.88rem'}}>Top clients by net income</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Ops</th><th style={{textAlign:'right'}}>Net</th></tr></thead>
              <tbody>
                {byClient.map(c=>(
                  <tr key={c.name}>
                    <td style={{fontWeight:500,fontSize:'0.82rem'}}>{c.name}</td>
                    <td style={{color:'var(--muted)'}}>{c.count}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:'var(--green)'}}>{formatMoney(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
