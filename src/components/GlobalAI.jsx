import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { useAIContext } from '../context/AIContext'
import { supabase } from '../lib/supabase'

const PAGE_LABELS = {
  '/':             'Operational Dashboard',
  '/register':     'Register',
  '/new':          'New Entry',
  '/tally':        'Client Tally',
  '/stats':        'Monthly Stats',
  '/finance':      'Finance',
  '/ports':        'Port Info',
  '/port-overview':'Port Lineup',
  '/soa':          'Statement of Account',
  '/templates':    'Email Templates',
  '/vessels':      'Vessel Database',
  '/contacts':     'Contacts',
  '/daily':        'Daily Report',
  '/health':       'System Health',
}

function buildSystem(location, pageContext) {
  const page = PAGE_LABELS[location.pathname] || location.pathname
  const ctx = pageContext || {}
  let contextStr = ''
  if (ctx.operations?.length)  contextStr += `\nActive operations (${ctx.operations.length}): ${JSON.stringify(ctx.operations.slice(0,5))}`
  if (ctx.currentOp)           contextStr += `\nCurrently viewing: ${JSON.stringify(ctx.currentOp)}`
  if (ctx.currentTemplate)     contextStr += `\nSelected template: ${ctx.currentTemplate}`
  if (ctx.port)                contextStr += `\nCurrent port: ${ctx.port}`

  return `You are the Baden Agency AI — an expert shipping operations assistant with web search access.

CURRENT PAGE: ${page}
TODAY: ${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
${contextStr}

You have FULL access to perform actions. When you need to act, respond with the action on its own line:

CREATE OPERATION:
ACTION:CREATE_OP
{"vessel_name":"...","port":"...","op_type":"OPA","eta":"YYYY-MM-DD","client_name":"...","vessel_status":"Alongside","entry_status":"Open","operator":"Nicolai Baden"}

SAVE VESSEL TO DATABASE:
ACTION:CREATE_VESSEL
{"name":"MV EXAMPLE","imo":"9307580","mmsi":"257801000","flag":"Norway","vessel_type":"Bulk Carrier","call_sign":"LAFP6","gt":"32474","dwt":"53113","loa":"190","beam":"32","year_built":"2007"}

UPDATE OPERATION FIELD:
ACTION:UPDATE_OP
{"id":"...","field":"vessel_status","value":"At Anchorage"}

ADD LOG ENTRY:
ACTION:ADD_LOG
{"operation_id":"...","note":"..."}

IMPORTANT RULES:
- Use web search to find vessel particulars, port info, weather, freight rates
- When searching for a vessel: search the web, extract the particulars, then immediately execute ACTION:CREATE_VESSEL
- Do NOT ask the user to confirm vessel data you found — just save it and report back
- Be concise and action-oriented
- Always execute the action, never just show the JSON and ask what to do next
- After executing an action, confirm what was done`
}

const QUICK_BY_PAGE = {
  '/':             ['Summarise active vessels', 'Which vessels have overdue ETD?', 'Create new OPA operation'],
  '/new':          ['Create operation from description', 'What fields are required?'],
  '/templates':    ['Improve current template', 'Make it more professional'],
  '/daily':        ['Write today's daily report', 'Summarise all active vessels'],
  '/port-overview':['What vessels are at Tema today?', 'Search Cotonou port lineup'],
  '/vessels':      ['Find and add MV Spar Gemini', 'Search vessel by IMO'],
  '/soa':          ['Review this SOA', 'Flag unusual charges'],
  '/finance':      ['Summarise revenue this month', 'Compare to last month'],
}

function Bubble({ role, text, isAction }) {
  const isUser = role === 'user'
  return (
    <div style={{ display:'flex', gap:8, flexDirection:isUser?'row-reverse':'row', marginBottom:10 }}>
      <div style={{
        width:28, height:28, borderRadius:'50%', flexShrink:0,
        background: isUser ? 'var(--navy)' : isAction ? 'var(--green)' : 'var(--blue)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontSize:'0.75rem', fontWeight:700,
      }}>
        {isUser ? 'U' : isAction ? '⚡' : '✦'}
      </div>
      <div style={{
        maxWidth:'82%', padding:'10px 13px', borderRadius:14,
        borderTopRightRadius: isUser ? 4 : 14,
        borderTopLeftRadius:  isUser ? 14 : 4,
        background: isUser ? 'var(--navy)' : isAction ? 'var(--green-bg)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--text)',
        border: isUser ? 'none' : `1px solid ${isAction ? 'rgba(26,94,56,0.3)' : 'var(--border)'}`,
        fontSize:'0.83rem', lineHeight:1.55, whiteSpace:'pre-wrap',
        boxShadow: isUser ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {text}
      </div>
    </div>
  )
}

// Parse and execute all actions in an AI reply
async function executeActions(reply, addMessage, onOperationCreated) {
  let remaining = reply
  let actionsExecuted = 0

  // ACTION:CREATE_VESSEL
  const vesselMatch = reply.match(/ACTION:CREATE_VESSEL\s*\n(\{[\s\S]*?\})/)
  if (vesselMatch) {
    try {
      const vesselData = JSON.parse(vesselMatch[1].trim())
      const { data, error } = await supabase
        .from('vessels')
        .upsert({ ...vesselData }, { onConflict: 'imo', ignoreDuplicates: false })
        .select()
      if (!error) {
        addMessage(`⚡ Vessel saved to database:\n**${vesselData.name}**\nIMO: ${vesselData.imo || '—'} · Flag: ${vesselData.flag || '—'} · Type: ${vesselData.vessel_type || '—'}\nDWT: ${vesselData.dwt || '—'} · LOA: ${vesselData.loa || '—'}m · Built: ${vesselData.year_built || '—'}`, true)
        actionsExecuted++
      } else {
        addMessage(`⚠️ Could not save vessel: ${error.message}`, true)
      }
    } catch(e) {
      addMessage(`⚠️ Error parsing vessel data: ${e.message}`, true)
    }
    remaining = remaining.replace(vesselMatch[0], '').trim()
  }

  // ACTION:CREATE_OP
  const opMatch = remaining.match(/ACTION:CREATE_OP\s*\n(\{[\s\S]*?\})/)
  if (opMatch) {
    try {
      const opData = JSON.parse(opMatch[1].trim())
      const { data, error } = await supabase
        .from('operations')
        .insert([{ ...opData, year: new Date().getFullYear(), op_date: new Date().toISOString().split('T')[0] }])
        .select().single()
      if (!error && data) {
        addMessage(`⚡ Operation created: **${data.ref}**\n${opData.vessel_name} · ${opData.port}\nStatus: ${opData.vessel_status} · Type: ${opData.op_type}`, true)
        if (onOperationCreated) onOperationCreated()
        actionsExecuted++
      } else {
        addMessage(`⚠️ Could not create operation: ${error?.message}`, true)
      }
    } catch(e) {
      addMessage(`⚠️ Error: ${e.message}`, true)
    }
    remaining = remaining.replace(opMatch[0], '').trim()
  }

  // ACTION:UPDATE_OP
  const updateMatch = remaining.match(/ACTION:UPDATE_OP\s*\n(\{[\s\S]*?\})/)
  if (updateMatch) {
    try {
      const { id, field, value } = JSON.parse(updateMatch[1].trim())
      const { error } = await supabase.from('operations').update({ [field]: value }).eq('id', id)
      if (!error) {
        addMessage(`⚡ Updated ${field} to "${value}"`, true)
        if (onOperationCreated) onOperationCreated()
        actionsExecuted++
      }
    } catch(e) { console.error(e) }
    remaining = remaining.replace(updateMatch[0], '').trim()
  }

  // ACTION:ADD_LOG
  const logMatch = remaining.match(/ACTION:ADD_LOG\s*\n(\{[\s\S]*?\})/)
  if (logMatch) {
    try {
      const { operation_id, note } = JSON.parse(logMatch[1].trim())
      const { error } = await supabase.from('operation_logs').insert([{ operation_id, note }])
      if (!error) {
        addMessage(`⚡ Log entry added: "${note}"`, true)
        actionsExecuted++
      }
    } catch(e) { console.error(e) }
    remaining = remaining.replace(logMatch[0], '').trim()
  }

  return { remaining: remaining.trim(), actionsExecuted }
}

export default function GlobalAI({ onOperationCreated }) {
  const [open, setOpen]       = useState(false)
  const [history, setHistory] = useState([])
  const [input, setInput]     = useState('')
  const [badge, setBadge]     = useState(null)
  const { ask, loading }      = useAI()
  const { pageContext }        = useAIContext()
  const location              = useLocation()
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)
  const prevPage              = useRef(location.pathname)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [history, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  useEffect(() => {
    if (location.pathname !== prevPage.current) {
      prevPage.current = location.pathname
      const label = PAGE_LABELS[location.pathname]
      if (label && !open) { setBadge(label); setTimeout(() => setBadge(null), 3000) }
    }
  }, [location.pathname, open])

  function addMessage(text, isAction = false) {
    setHistory(h => [...h, { role:'assistant', content:text, isAction }])
  }

  const quickPrompts = QUICK_BY_PAGE[location.pathname] || QUICK_BY_PAGE['/']
  const pageName = PAGE_LABELS[location.pathname] || 'Baden Agency'

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newHistory = [...history, { role:'user', content:msg }]
    setHistory(newHistory)

    const system = buildSystem(location, pageContext)
    const reply = await ask(msg, { system, history, max_tokens:2000 })
    if (!reply) return

    // Execute any actions in the reply
    const { remaining, actionsExecuted } = await executeActions(reply, addMessage, onOperationCreated)

    // Show the non-action text if there is any
    if (remaining && remaining.length > 10) {
      setHistory(h => [...h, { role:'assistant', content:remaining }])
    } else if (actionsExecuted === 0) {
      // No actions and no text — show full reply
      setHistory(h => [...h, { role:'assistant', content:reply }])
    }
  }

  return (
    <>
      {badge && !open && (
        <div style={{
          position:'fixed', bottom:82, right:24, zIndex:299,
          background:'var(--navy)', color:'#fff',
          padding:'8px 14px', borderRadius:20, fontSize:'0.75rem',
          boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
        }}>
          ✦ AI ready for {badge}
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} title="AI Assistant" style={{
        position:'fixed', bottom:24, right:24, zIndex:300,
        width:48, height:48, borderRadius:'50%',
        background:'var(--navy)', color:'#fff', border:'none',
        fontSize:'1.1rem', cursor:'pointer',
        boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
        {open ? '✕' : '✦'}
      </button>

      {open && (
        <div style={{
          position:'fixed', bottom:82, right:24, zIndex:300,
          width:400, height:580, maxHeight:'calc(100dvh - 100px)',
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.2)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          <div style={{ background:'var(--navy)', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <span style={{ color:'var(--blue)', fontSize:'1rem' }}>✦</span>
            <div style={{ flex:1 }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:'0.88rem' }}>Baden AI</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem' }}>{pageName} · web search enabled</div>
            </div>
            <button onClick={() => setHistory([])}
              style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.6)', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:'0.72rem' }}>
              Clear
            </button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
            {history.length === 0 && (
              <div>
                <div style={{ color:'var(--muted)', fontSize:'0.75rem', textAlign:'center', marginBottom:12, marginTop:4 }}>
                  On <strong>{pageName}</strong> · can search web, create &amp; edit data
                </div>
                {quickPrompts.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'8px 12px', marginBottom:5,
                    background:'var(--bg)', border:'1px solid var(--border)',
                    borderRadius:8, fontSize:'0.79rem', color:'var(--text)', cursor:'pointer',
                    transition:'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--navy)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {history.map((m, i) => <Bubble key={i} role={m.role} text={m.content} isAction={m.isAction} />)}
            {loading && (
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>✦</div>
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'10px 13px', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--muted)', animation:'bounce 1s infinite', animationDelay:`${i*0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', background:'var(--bg)', flexShrink:0 }}>
            <div style={{ display:'flex', gap:8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Ask about ${pageName.toLowerCase()}…`}
                rows={2}
                style={{ flex:1, resize:'none', fontSize:'0.82rem', padding:'8px 10px', borderRadius:8 }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="btn-primary btn-sm" style={{ alignSelf:'flex-end', padding:'8px 12px' }}>↑</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
