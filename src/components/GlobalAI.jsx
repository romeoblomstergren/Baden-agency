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
  if (ctx.operations?.length)    contextStr += `\nActive operations (${ctx.operations.length}): ${JSON.stringify(ctx.operations.slice(0,5), null, 2)}`
  if (ctx.currentOp)             contextStr += `\nCurrently viewing: ${JSON.stringify(ctx.currentOp, null, 2)}`
  if (ctx.currentTemplate)       contextStr += `\nSelected template: ${ctx.currentTemplate}`
  if (ctx.templateBody)          contextStr += `\nCurrent template body (first 500 chars): ${ctx.templateBody.slice(0,500)}`
  if (ctx.selectedVessel)        contextStr += `\nSelected vessel: ${JSON.stringify(ctx.selectedVessel, null, 2)}`
  if (ctx.port)                  contextStr += `\nCurrent port context: ${ctx.port}`

  return `You are the Baden Agency AI assistant — an expert shipping operations AI embedded directly into the Baden Agency platform.

CURRENT PAGE: ${page}
TODAY: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
${contextStr}

You can:
1. ANSWER questions about operations, vessels, ports, maritime law, shipping routes
2. DRAFT emails (type ACTION:DRAFT_EMAIL followed by subject and body)
3. CREATE operations (type ACTION:CREATE_OP followed by JSON)
4. SEARCH vessels (type ACTION:SEARCH_VESSEL followed by IMO or name)
5. SUMMARIZE current page data
6. SUGGEST next actions based on context
7. EXPLAIN maritime terms and procedures

When creating operations respond with:
ACTION:CREATE_OP
{"vessel_name":"...","port":"...","op_type":"OPA","eta":"YYYY-MM-DD","client_name":"...","vessel_status":"Alongside","entry_status":"Open","operator":"Nicolai Baden"}

When drafting emails respond with:
ACTION:DRAFT_EMAIL
Subject: ...
[email body]

Be concise, professional, maritime-savvy. Use proper shipping terminology.
Always be aware of what page the user is on and tailor your responses accordingly.`
}

const QUICK_BY_PAGE = {
  '/':             ['Summarise active vessels', 'Which vessels have overdue ETD?', 'Create new operation'],
  '/new':          ['Pre-fill from description', 'What fields are required?'],
  '/templates':    ['Improve this template', 'Add more vessel details', 'Make it more formal'],
  '/daily':        ['Write the daily report', 'Summarise vessel situations'],
  '/port-overview':['Search Tema port lineup', 'What vessels call at Rotterdam?'],
  '/soa':          ['Review this SOA', 'Flag any unusual charges'],
  '/vessels':      ['Find vessel by IMO', 'What is the typical DWT for a bulk carrier?'],
  '/finance':      ['Summarise this month revenue', 'Compare to last month'],
}

function Bubble({ role, text, isAction }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--navy)' : isAction ? 'var(--green)' : 'var(--blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
      }}>
        {isUser ? 'U' : isAction ? '⚡' : '✦'}
      </div>
      <div style={{
        maxWidth: '82%', padding: '10px 13px', borderRadius: 14,
        borderTopRightRadius: isUser ? 4 : 14,
        borderTopLeftRadius: isUser ? 14 : 4,
        background: isUser ? 'var(--navy)' : isAction ? 'var(--green-bg)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--text)',
        border: isUser ? 'none' : `1px solid ${isAction ? 'rgba(26,94,56,0.3)' : 'var(--border)'}`,
        fontSize: '0.83rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
        boxShadow: isUser ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {text}
      </div>
    </div>
  )
}

export default function GlobalAI({ onOperationCreated }) {
  const [open, setOpen]       = useState(false)
  const [history, setHistory] = useState([])
  const [input, setInput]     = useState('')
  const [badge, setBadge]     = useState(null) // page-change notification
  const { ask, loading }      = useAI()
  const { pageContext }        = useAIContext()
  const location              = useLocation()
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)
  const prevPage              = useRef(location.pathname)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  // Show badge when page changes
  useEffect(() => {
    if (location.pathname !== prevPage.current) {
      prevPage.current = location.pathname
      const label = PAGE_LABELS[location.pathname]
      if (label && !open) {
        setBadge(label)
        setTimeout(() => setBadge(null), 3000)
      }
    }
  }, [location.pathname, open])

  const quickPrompts = QUICK_BY_PAGE[location.pathname] || QUICK_BY_PAGE['/']

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newHistory = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)

    const system = buildSystem(location, pageContext)
    const reply = await ask(msg, { system, history, max_tokens: 2000 })
    if (!reply) return

    // Handle ACTION:CREATE_OP
    if (reply.includes('ACTION:CREATE_OP')) {
      const jsonMatch = reply.match(/ACTION:CREATE_OP\s*([\s\S]*?)(?=\n\n|ACTION:|$)/)
      if (jsonMatch) {
        try {
          const opData = JSON.parse(jsonMatch[1].trim())
          const { data, error } = await supabase.from('operations').insert([{
            ...opData,
            year: new Date().getFullYear(),
            op_date: new Date().toISOString().split('T')[0],
          }]).select().single()
          if (!error && data) {
            setHistory(h => [...h, { role: 'assistant', content: `⚡ Operation created: **${data.ref}** — ${opData.vessel_name} at ${opData.port}\n\nYou can find it in the Operational dashboard.`, isAction: true }])
            if (onOperationCreated) onOperationCreated()
            return
          }
        } catch(e) { console.error('Create op failed:', e) }
      }
    }

    // Handle ACTION:DRAFT_EMAIL — copy to clipboard
    if (reply.includes('ACTION:DRAFT_EMAIL')) {
      const emailContent = reply.replace('ACTION:DRAFT_EMAIL', '').trim()
      navigator.clipboard.writeText(emailContent).catch(() => {})
      setHistory(h => [...h, { role: 'assistant', content: '⚡ Email drafted and copied to clipboard!\n\n' + emailContent, isAction: true }])
      return
    }

    setHistory(h => [...h, { role: 'assistant', content: reply }])
  }

  const pageName = PAGE_LABELS[location.pathname] || 'Baden Agency'
  const contextCount = Object.keys(pageContext).filter(k => pageContext[k]).length

  return (
    <>
      {/* Page change badge */}
      {badge && !open && (
        <div style={{
          position: 'fixed', bottom: 82, right: 24, zIndex: 299,
          background: 'var(--navy)', color: '#fff',
          padding: '8px 14px', borderRadius: 20, fontSize: '0.75rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease',
        }}>
          ✦ AI ready for {badge}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 300,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--navy)', color: '#fff', border: 'none',
          fontSize: '1.1rem', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? '✕' : '✦'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 82, right: 24, zIndex: 300,
          width: 400, height: 580, maxHeight: 'calc(100dvh - 100px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: 'var(--navy)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ color: 'var(--blue)', fontSize: '1rem' }}>✦</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Baden AI</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                {pageName} · {contextCount > 0 ? `${contextCount} context signals` : 'page aware'}
              </div>
            </div>
            <button onClick={() => { setHistory([]); }} title="Clear chat"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.72rem' }}>
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {history.length === 0 && (
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center', marginBottom: 12, marginTop: 4 }}>
                  On <strong>{pageName}</strong> — ask me anything
                </div>
                {quickPrompts.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', marginBottom: 5,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: '0.79rem', color: 'var(--text)', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--navy)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            {history.map((m, i) => <Bubble key={i} role={m.role} text={m.content} isAction={m.isAction} />)}
            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>✦</div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 13px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', animation: 'bounce 1s infinite', animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Ask about ${pageName.toLowerCase()}…`}
                rows={2}
                style={{ flex: 1, resize: 'none', fontSize: '0.82rem', padding: '8px 10px', borderRadius: 8 }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="btn-primary btn-sm" style={{ alignSelf: 'flex-end', padding: '8px 12px' }}>↑</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}
