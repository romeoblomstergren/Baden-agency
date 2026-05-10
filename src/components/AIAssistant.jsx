import { useState, useRef, useEffect } from 'react'
import { useAI } from '../hooks/useAI'
import { supabase } from '../lib/supabase'

const SYSTEM = (operations) => `You are an expert shipping agency operations assistant for Baden Agency.
You have real-time access to these active operations:
${JSON.stringify(operations, null, 2)}

You can ALSO perform actions when asked:
- Create new operations (respond with ACTION:CREATE_OP followed by JSON)
- Answer questions about vessels, ports, weather, shipping routes
- Draft emails (OPA, ETA notifications, NOR, appointments)
- Summarize vessel situations

When creating an operation, respond with:
ACTION:CREATE_OP
{"vessel_name":"...","port":"...","op_type":"OPA","eta":"YYYY-MM-DD","client_name":"...","vessel_status":"Alongside","entry_status":"Open","operator":"Nicolai Baden"}

Be concise, professional, and use proper maritime terminology.
When drafting emails, include Subject, salutation, body, and sign-off "Baden Agency".`

const QUICK = [
  'Summarise all active vessels',
  'Which vessels have ETA today or tomorrow?',
  'Draft a port agency appointment letter',
  'Write an ETA notification to the principal',
]

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
        maxWidth: '80%', padding: '10px 13px', borderRadius: 14,
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

export default function AIAssistant({ operations = [], onOperationCreated }) {
  const [open,    setOpen]    = useState(false)
  const [history, setHistory] = useState([])
  const [input,   setInput]   = useState('')
  const { ask, loading } = useAI()
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newHistory = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)

    const reply = await ask(msg, { system: SYSTEM(operations), history, max_tokens: 1500 })
    if (!reply) return

    // Check if AI wants to create an operation
    if (reply.includes('ACTION:CREATE_OP')) {
      const jsonMatch = reply.match(/ACTION:CREATE_OP\s*([\s\S]*?)(?:\n\n|$)/)
      if (jsonMatch) {
        try {
          const opData = JSON.parse(jsonMatch[1].trim())
          const { data, error } = await supabase.from('operations').insert([{
            ...opData,
            year: new Date().getFullYear(),
            op_date: new Date().toISOString().split('T')[0],
          }]).select().single()

          if (!error && data) {
            const confirmMsg = `✅ Operation created: **${data.ref}** — ${opData.vessel_name} at ${opData.port}`
            setHistory(h => [...h, { role: 'assistant', content: confirmMsg, isAction: true }])
            if (onOperationCreated) onOperationCreated()
            return
          }
        } catch(e) {
          console.error('Failed to create op:', e)
        }
      }
    }

    setHistory(h => [...h, { role: 'assistant', content: reply }])
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 300,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--navy)', color: '#fff', border: 'none',
          fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open ? '✕' : '✦'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 82, right: 24, zIndex: 300,
          width: 380, height: 560, maxHeight: 'calc(100dvh - 100px)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ background: 'var(--navy)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ color: 'var(--blue)', fontSize: '1rem' }}>✦</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Baden AI Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                {operations.length} vessel{operations.length !== 1 ? 's' : ''} in context · can create operations
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
            {history.length === 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 14, marginTop: 8 }}>
                  Ask me anything — I can also create new operations
                </div>
                {QUICK.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 12px', marginBottom: 6,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: '0.8rem', color: 'var(--text)', cursor: 'pointer',
                  }}>
                    {q}
                  </button>
                ))}
                <button onClick={() => send('Create a new OPA operation for MV Test Vessel arriving Rotterdam tomorrow')}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 12px', marginBottom: 6,
                    background: 'var(--green-bg)', border: '1px solid rgba(26,94,56,0.2)',
                    borderRadius: 8, fontSize: '0.8rem', color: 'var(--text)', cursor: 'pointer',
                  }}>
                  ⚡ Create a new operation (example)
                </button>
              </div>
            )}
            {history.map((m, i) => <Bubble key={i} role={m.role} text={m.content} isAction={m.isAction} />)}
            {loading && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>✦</div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 13px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', animation: 'bounce 1s infinite', animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask anything or say 'Create operation for MV…'"
                rows={2}
                style={{ flex: 1, resize: 'none', fontSize: '0.82rem', padding: '8px 10px', borderRadius: 8 }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="btn-primary btn-sm" style={{ alignSelf: 'flex-end', padding: '8px 12px' }}>↑</button>
            </div>
            {history.length > 0 && (
              <button onClick={() => setHistory([])}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.72rem', cursor: 'pointer', marginTop: 6, padding: 0 }}>
                Clear conversation
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
