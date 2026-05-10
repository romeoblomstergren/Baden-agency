import { useState } from 'react'
import { useActiveVessels } from '../hooks/useOperations'
import { useTasks } from '../hooks/useTasks'
import { useAI } from '../hooks/useAI'
import { formatDate } from '../lib/constants'

function VesselReport({ op }) {
  const { tasks, completedCount, total } = useTasks(op.id)
  const etLine = [
    op.eta && 'ETA: ' + formatDate(op.eta) + (op.eta_ampm ? ' ' + op.eta_ampm : ''),
    op.etb && 'ETB: ' + formatDate(op.etb) + (op.etb_ampm ? ' ' + op.etb_ampm : ''),
    op.etc && 'ETC: ' + formatDate(op.etc) + (op.etc_ampm ? ' ' + op.etc_ampm : ''),
    op.etd && 'ETD: ' + formatDate(op.etd) + (op.etd_ampm ? ' ' + op.etd_ampm : ''),
  ].filter(Boolean).join(' · ')
  const pendingTasks = tasks.filter(t => !t.done).map(t => '- ' + t.task).join('\n')
  const doneTasks    = tasks.filter(t =>  t.done).map(t => '✓ ' + t.task).join('\n')
  return { text: ['─'.repeat(60), (op.vessel_name||'—')+' | '+op.ref, '─'.repeat(60), 'Status        : '+(op.vessel_status||'—'), 'Port          : '+(op.port||'—'), 'Principal     : '+(op.client_name||'—'), 'Sub-Agent     : '+(op.sub_agent||'—'), op.commodity?'Commodity     : '+op.commodity+(op.quantity?' — '+op.quantity:''):'', op.commodity_2?'Commodity 2   : '+op.commodity_2+(op.quantity_2?' — '+op.quantity_2:''):'', etLine?'Timeline      : '+etLine:'', total>0?'Tasks         : '+completedCount+'/'+total+' completed':'', op.notes?'\nNotes: '+op.notes:'', pendingTasks?'\nPending tasks:\n'+pendingTasks:'', doneTasks?'\nCompleted tasks:\n'+doneTasks:''].filter(Boolean).join('\n') }
}

export default function DailyReport() {
  const { data: active, loading } = useActiveVessels()
  const { ask, loading: aiLoading } = useAI()
  const [copied, setCopied]           = useState(false)
  const [reportNotes, setReportNotes] = useState('')
  const [aiReport, setAiReport]       = useState('')
  const [aiMode, setAiMode]           = useState(false)

  const today   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' })
  const header = 'BADEN AGENCY — DAILY OPERATIONS REPORT\n' + dayName.toUpperCase() + ', ' + today.toUpperCase() + '\n' + '═'.repeat(60) + '\n\nActive vessels: ' + active.length + '\n'
  const footer = '\n' + '═'.repeat(60) + '\nBaden Agency — Confidential\nGenerated: ' + today + (reportNotes ? '\n\nAdditional notes:\n' + reportNotes : '')
  const vesselTexts   = active.map(op => VesselReport({ op }).text).join('\n\n')
  const manualReport  = header + '\n' + vesselTexts + '\n' + footer
  const displayReport = aiMode && aiReport ? aiReport : manualReport

  const copy = () => { navigator.clipboard.writeText(displayReport); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const openMail = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('Baden Agency — Daily Operations Report — ' + today) + '&body=' + encodeURIComponent(displayReport) }
  const generateAI = async () => {
    const result = await ask('Write a professional daily operations report for Baden Agency for ' + dayName + ', ' + today + '.\nRaw data:\n\n' + manualReport + '\n\nRewrite as a polished professional shipping agency daily report. Keep all facts accurate.' + (reportNotes ? '\nAdditional notes: ' + reportNotes : ''), { system: 'You are a senior shipping agent at Baden Agency. Write professionally, concisely, in standard maritime report format.', max_tokens: 2000 })
    if (result) { setAiReport(result); setAiMode(true) }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1>Daily Report</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>{dayName}, {today} · {active.length} active vessel{active.length!==1?'s':''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copy} className="btn-secondary btn-sm">{copied ? '✓ Copied!' : '📋 Copy'}</button>
          <button onClick={openMail} className="btn-secondary btn-sm">✉️ Open in Mail</button>
          <button onClick={generateAI} disabled={aiLoading || active.length === 0} className="btn-primary btn-sm">{aiLoading ? '◌ Generating…' : '✦ AI Polish'}</button>
        </div>
      </div>
      {aiReport && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          <button onClick={() => setAiMode(false)} className={aiMode ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>Manual</button>
          <button onClick={() => setAiMode(true)}  className={aiMode ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>✦ AI Version</button>
        </div>
      )}
      {active.length === 0 ? (
        <div className="card empty"><div className="empty-icon">📋</div><p>No active vessels to report on.</p></div>
      ) : (<>
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Additional notes (appended to report)</label>
            <textarea value={reportNotes} onChange={e => setReportNotes(e.target.value)} rows={3} placeholder="Market comments, upcoming fixtures, general notes…" />
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{aiMode ? '✦ AI-polished report' : 'Report preview'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{aiMode ? 'Editable — click to modify' : 'Edit notes above to customize'}</span>
          </div>
          <pre style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)', margin: 0, maxHeight: 600, overflowY: 'auto' }}>{displayReport}</pre>
        </div>
      </>)}
    </div>
  )
}