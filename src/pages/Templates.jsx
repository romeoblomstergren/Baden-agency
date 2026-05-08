import { useState } from 'react'
import { useOperations } from '../hooks/useOperations'
import { useActiveVessels } from '../hooks/useOperations'
import { formatDate } from '../lib/constants'

const TEMPLATES = [
  {
    id: 'arrival',
    label: '⚓ Arrival Notice',
    subject: (op) => `Arrival Notice — ${op.vessel_name} — ${op.port}`,
    body: (op) => `Dear Sir/Madam,

We hereby give notice of the expected arrival of the below vessel:

Vessel: ${op.vessel_name || '—'}
Port: ${op.port || '—'}
ETA: ${formatDate(op.eta)}
Operation: ${op.op_type || '—'}
Principal: ${op.client_name || '—'}
Reference: ${op.ref || '—'}

We will keep you updated with any changes to the ETA.

Please confirm receipt and advise of any port requirements.

Kind regards,
Baden Agency`
  },
  {
    id: 'departure',
    label: '🚢 Departure Notice',
    subject: (op) => `Departure Notice — ${op.vessel_name} — ${op.port}`,
    body: (op) => `Dear Sir/Madam,

We hereby give notice of the expected departure of the below vessel:

Vessel: ${op.vessel_name || '—'}
Port: ${op.port || '—'}
ETD: ${formatDate(op.etd)}
Operation: ${op.op_type || '—'}
Principal: ${op.client_name || '—'}
Reference: ${op.ref || '—'}

Please confirm all port formalities are in order for departure.

Kind regards,
Baden Agency`
  },
  {
    id: 'daily',
    label: '📋 Daily Status Report',
    subject: (op) => `Daily Report — ${op.vessel_name} — ${formatDate(new Date().toISOString().split('T')[0])}`,
    body: (op) => `Dear Sir/Madam,

Please find below the daily status report for ${op.vessel_name}:

Vessel: ${op.vessel_name || '—'}
Port: ${op.port || '—'}
Status: ${op.vessel_status || '—'}
ETA: ${formatDate(op.eta)}
ETB: ${formatDate(op.etb)}
ETD: ${formatDate(op.etd)}
Reference: ${op.ref || '—'}

Operations update:
[Add update here]

Sub-agent: ${op.sub_agent || '—'}

We will continue to keep you updated.

Kind regards,
Baden Agency`
  },
  {
    id: 'cargo',
    label: '📦 Cargo Confirmation',
    subject: (op) => `Cargo Confirmation — ${op.vessel_name} — ${op.port}`,
    body: (op) => `Dear Sir/Madam,

We hereby confirm the cargo details for the below vessel:

Vessel: ${op.vessel_name || '—'}
Port: ${op.port || '—'}
Operation: ${op.op_type || '—'}
Principal: ${op.client_name || '—'}
Reference: ${op.ref || '—'}

Cargo details:
- Commodity: [Add commodity]
- Quantity: [Add quantity]
- ETC: [Add ETC]

Please confirm receipt and advise if any additional information is required.

Kind regards,
Baden Agency`
  },
  {
    id: 'invoice',
    label: '💰 Invoice Covering Letter',
    subject: (op) => `Invoice — ${op.vessel_name} — ${op.ref}`,
    body: (op) => `Dear Sir/Madam,

Please find enclosed our invoice for services rendered in connection with the below vessel call:

Vessel: ${op.vessel_name || '—'}
Port: ${op.port || '—'}
Reference: ${op.ref || '—'}
Invoice amount: [Add amount]

We kindly request payment within 30 days of receipt.

For any queries regarding this invoice, please do not hesitate to contact us.

Kind regards,
Baden Agency`
  },
]

export default function Templates() {
  const { data: allOps } = useOperations({ limit: 2000 })
  const { data: active } = useActiveVessels()
  const [selectedOp, setSelectedOp] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customBody, setCustomBody] = useState('')
  const [copied, setCopied] = useState(false)

  const op = selectedOp ? allOps.find(o => o.id === selectedOp) : null
  const template = selectedTemplate ? TEMPLATES.find(t => t.id === selectedTemplate) : null

  const subject = op && template ? template.subject(op) : ''
  const body = customBody || (op && template ? template.body(op) : '')

  const handleTemplateSelect = (tid) => {
    setSelectedTemplate(tid)
    setCopied(false)
    if (op) {
      const t = TEMPLATES.find(t => t.id === tid)
      setCustomBody(t ? t.body(op) : '')
    }
  }

  const handleOpSelect = (id) => {
    setSelectedOp(id)
    setCopied(false)
    if (selectedTemplate) {
      const t = TEMPLATES.find(t => t.id === selectedTemplate)
      const operation = allOps.find(o => o.id === id)
      setCustomBody(t && operation ? t.body(operation) : '')
    }
  }

  const copyBody = () => {
    navigator.clipboard.writeText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openMail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  // Generate .ics calendar file
  const exportCalendar = () => {
    const events = []
    allOps.forEach(op => {
      if (op.eta) events.push({ date: op.eta, title: `ETA — ${op.vessel_name} — ${op.port}`, ref: op.ref })
      if (op.etb) events.push({ date: op.etb, title: `ETB — ${op.vessel_name} — ${op.port}`, ref: op.ref })
      if (op.etd) events.push({ date: op.etd, title: `ETD — ${op.vessel_name} — ${op.port}`, ref: op.ref })
    })

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Baden Agency//EN',
      'CALSCALE:GREGORIAN',
      ...events.map(e => {
        const d = e.date.replace(/-/g, '')
        return [
          'BEGIN:VEVENT',
          `DTSTART;VALUE=DATE:${d}`,
          `DTEND;VALUE=DATE:${d}`,
          `SUMMARY:${e.title}`,
          `DESCRIPTION:${e.ref}`,
          `UID:${e.ref}-${e.date}@badenagency`,
          'END:VEVENT',
        ].join('\n')
      }),
      'END:VCALENDAR',
    ].join('\n')

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'baden-agency-schedule.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1>Email Templates</h1>
        <button onClick={exportCalendar} className="btn-secondary btn-sm">
          📅 Export to Apple Calendar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        {/* Left panel */}
        <div>
          {/* Template picker */}
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Template</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => handleTemplateSelect(t.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                    background: selectedTemplate === t.id ? 'var(--navy)' : 'var(--bg)',
                    color: selectedTemplate === t.id ? '#fff' : 'var(--text)',
                    transition: 'all 0.15s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vessel picker */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Vessel / Operation</div>
            <select value={selectedOp || ''} onChange={e => handleOpSelect(e.target.value)}
              style={{ width: '100%' }}>
              <option value="">Select operation…</option>
              {active.length > 0 && (
                <optgroup label="— Active vessels —">
                  {active.map(o => (
                    <option key={o.id} value={o.id}>{o.vessel_name} · {o.port}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="— All operations —">
                {allOps.map(o => (
                  <option key={o.id} value={o.id}>{o.ref} · {o.vessel_name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Right panel — email preview */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selectedTemplate || !selectedOp ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>✉️</div>
              <p>Select a template and vessel to generate an email</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input value={subject} readOnly style={{ fontWeight: 600 }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Body — edit before sending</label>
                <textarea
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  rows={18}
                  style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.7, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={openMail} className="btn-primary" style={{ flex: 1 }}>
                  ✉️ Open in Mail
                </button>
                <button onClick={copyBody} className="btn-secondary" style={{ flex: 1 }}>
                  {copied ? '✓ Copied!' : '📋 Copy body'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
