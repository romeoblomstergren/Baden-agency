import { useState } from 'react'
import { useOperations, useActiveVessels } from '../hooks/useOperations'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/constants'

const BA_ADDRESS = `Suite 1702, Level 17,
Boulevard Plaza Tower 1,
Sheikh Mohammed Bin Rashid Bld,
Downtown Dubai, Dubai, UAE
PO BOX 416654`

// Helper — all template functions receive a fully-loaded operation object
function vals(op) {
  return {
    v:          op.vessel_name  || '[VESSEL NAME]',
    port:       op.port         || '[PORT]',
    eta:        op.eta          ? formatDate(op.eta) + (op.eta_ampm ? ' ' + op.eta_ampm : '') : '[PLEASE ADVISE]',
    etb:        op.etb          ? formatDate(op.etb) + (op.etb_ampm ? ' ' + op.etb_ampm : '') : 'PLEASE ADVISE',
    etc:        op.etc          ? formatDate(op.etc) + (op.etc_ampm ? ' ' + op.etc_ampm : '') : 'PLEASE ADVISE',
    etd:        op.etd          ? formatDate(op.etd) + (op.etd_ampm ? ' ' + op.etd_ampm : '') : 'PLEASE ADVISE',
    imo:        op.imo          || '[IMO]',
    mmsi:       op.mmsi         || '[MMSI]',
    call_sign:  op.call_sign    || '[CALL SIGN]',
    flag:       op.flag         || '[FLAG]',
    vessel_type:op.vessel_type  || '[TYPE]',
    gt:         op.gt           || '[GT]',
    dwt:        op.dwt          || '[DWT]',
    loa:        op.loa          || '[LOA]',
    beam:       op.beam         || '[BEAM]',
    year_built: op.year_built   || '[YEAR]',
    client:     op.client_name  || '[PRINCIPAL]',
    sub_agent:  op.sub_agent    || '[SUB-AGENT]',
    commodity:  op.commodity    || '[COMMODITY]',
    commodity2: op.commodity_2  || '',
    quantity:   op.quantity     || '[QUANTITY]',
    quantity2:  op.quantity_2   || '',
    terms:      op.cargo_terms  || '[TERMS]',
    operator:   op.operator     || '[OPERATOR]',
    ref:        op.ref          || '[REF]',
    notes:      op.notes        || '',
  }
}

function opaTemplate(op) {
  const x = vals(op)
  return `${x.v} - ${x.port} - OPA APPOINTMENT - ${x.quantity} ${x.commodity}

TO: ${x.sub_agent.toUpperCase()} - AGENCY DEPT.
FM: BADEN AGENCY - ${x.operator.toUpperCase()} - SERVICE PROVIDER
---------------------------------------------------------------------------------------------------------------------------------------------------
PORT                             \t- ${x.port}
CARGO                         \t- ${x.commodity}${x.commodity2 ? ' / ' + x.commodity2 : ''}
QUANTITY                     \t- ${x.quantity}${x.quantity2 ? ' / ' + x.quantity2 : ''}
ETA\t\t\t\t\t- ${x.eta} AGW. WP. @ ${x.port} ANCHORAGE
POB                               \t- PLEASE ADVISE
ETB                               \t- ${x.etb}
OPS. EXP. TO START    - PLEASE ADVISE
TURN-AROUND\t\t- PLEASE ADVISE
ETS\t\t\t\t\t- ${x.etd}
---------------------------------------------------------------------------------------------------------------------------------------------------

Ref. ${x.ref}, we hereby appoint ${x.sub_agent} to act as protective agent for and on behalf of BADEN AGENCY for subject mentioned vessel's forthcoming call at ${x.port} for discharging/loading ${x.quantity} ${x.commodity} under ${x.terms} terms.

VESSEL PARTICULARS:
--------------------------------------------
Vessel Name\t\t: ${x.v}
IMO No.\t\t\t: ${x.imo}
MMSI\t\t\t\t: ${x.mmsi}
Call Sign\t\t\t: ${x.call_sign}
Flag\t\t\t\t: ${x.flag}
Type\t\t\t\t: ${x.vessel_type}
GT\t\t\t\t\t: ${x.gt}
DWT\t\t\t\t: ${x.dwt}
LOA\t\t\t\t: ${x.loa} m
Beam\t\t\t\t: ${x.beam} m
Year Built\t\t\t: ${x.year_built}

MAILING LIST:
--------------------------------------------
Baden Agency LLC
PIC\t\t\t\t\t: ${x.operator}
Mail\t\t\t\t\t: agency@baden-agency.com

SCOPE OF WORK FOR OPA:
--------------------------------------------
- Monitor that the vessel is handled as per the charter party.
- Follow that all costs are kept to a minimum at all times.
- Follow that no unauthorized cost is added to the DA.
- Monitor that the port operations are conducted in accordance with the stowage plan.
- Have a boarding agent on the ground every working day throughout the cargo operation.
- Liaise with Receiver's agent / Stevedore Foreman / Receiver in order to be fully on top of the cargo operation.
- Present intermediary SOF to the Master on a regular basis.
- Send 2 (two) daily operational reports every working day throughout the cargo operation.
- Report any incident to this office that has any in/direct impact on the cargo operation.
- Send SOF draft to this office for approval MIN. 24 hrs. before expected completion of cargo operation.

DISBURSEMENT ACCOUNT:
--------------------------------------------
- Submit PD/A for our approval prior vessel's arrival.
- Only official port tariffs to be applied.
- Only compulsory costs to be included.
- Agency fee to cover communication, postage, petties etc. NO extras will be accepted.
- For any 3rd party cost, please provide original supporting voucher.

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

PLEASE REVERT WITH PORT & OPERATIONAL INFO AS REQUESTED BELOW

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

HEALTH PROTOCOL:
- Please advise health protocol / procedure.
- Please advise if there are any particular restrictions.

ISPS & PFSO:
- Please advise ISPS security level.
- Please revert with name and contact details of PFSO.

TUG ASSISTANCE:
- Please advise if tug assistance is compulsory.
- If positive, please advise number of tug-boats and costs.

PILOTAGE:
- Please advise if pilotage is compulsory.

PORT INFO & RESTRICTIONS:
- Please advise safe anchorage position.
- Please advise pilot rendez-vous point.
- Please advise designated berth.
- Please advise MAX draft at designated berth.
- Please advise MAX LOA at designated berth.
- Please advise if tidal port.
- Please advise if daylight only navigation.

WORKING HOURS:
- Please advise port working hours.
- Please advise stevedore shift hours.

WATER DENSITY:
- Please advise water density.

MARPOL REGULATIONS:
- Please advise MARPOL regulations.
- Please advise if open loop scrubber system is allowed.

+++

Sake good order, we kindly ask you to confirm safe receipt of this message by return.`
}

function pagTemplate(op) {
  const x = vals(op)
  return `${x.v} - ${x.port} - PORT AGENCY APPOINTMENT

TO: [PORT AGENT NAME] - AGENCY DEPT.
FM: BADEN AGENCY - ${x.operator.toUpperCase()} - ON BEHALF OF ${x.client.toUpperCase()}
---------------------------------------------------------------------------------------------------------------------------------------------------
PORT                             \t- ${x.port}
CARGO                         \t- ${x.commodity}${x.commodity2 ? ' / ' + x.commodity2 : ''}
QUANTITY                     \t- ${x.quantity}${x.quantity2 ? ' / ' + x.quantity2 : ''}
ETA\t\t\t\t\t- ${x.eta} AGW. WP.
ETB                               \t- ${x.etb}
ETS\t\t\t\t\t- ${x.etd}
---------------------------------------------------------------------------------------------------------------------------------------------------

Dear Sir/Madam,

We hereby appoint you to act as Port Agent for and on behalf of ${x.client} / BADEN AGENCY for subject mentioned vessel's forthcoming call at ${x.port}.

VESSEL PARTICULARS:
--------------------------------------------
Vessel Name\t\t: ${x.v}
IMO No.\t\t\t: ${x.imo}
MMSI\t\t\t\t: ${x.mmsi}
Call Sign\t\t\t: ${x.call_sign}
Flag\t\t\t\t: ${x.flag}
Type\t\t\t\t: ${x.vessel_type}
GT\t\t\t\t\t: ${x.gt}
DWT\t\t\t\t: ${x.dwt}
LOA\t\t\t\t: ${x.loa} m
Beam\t\t\t\t: ${x.beam} m
Year Built\t\t\t: ${x.year_built}

OPERATIONAL DETAILS:
--------------------------------------------
Port\t\t\t\t\t: ${x.port}
Operation\t\t\t: [DISCHARGING / LOADING]
Cargo\t\t\t\t: ${x.commodity}${x.commodity2 ? ' / ' + x.commodity2 : ''}
Quantity\t\t\t\t: ${x.quantity}${x.quantity2 ? ' / ' + x.quantity2 : ''}
Terms\t\t\t\t: ${x.terms}
ETA\t\t\t\t\t: ${x.eta}
ETB\t\t\t\t\t: ${x.etb}
ETD\t\t\t\t\t: ${x.etd}

PRINCIPAL:
--------------------------------------------
${x.client}

MAILING LIST:
--------------------------------------------
Baden Agency LLC
PIC\t\t\t\t\t: ${x.operator}
Mail\t\t\t\t\t: agency@baden-agency.com

SCOPE OF WORK:
--------------------------------------------
- Handle all port formalities including customs clearance, port health, immigration.
- Arrange pilotage and tug assistance as required.
- Arrange berthing in coordination with port authorities.
- Ensure all pre-arrival documentation is submitted in due time.
- Liaise with stevedores / terminal regarding cargo operations.
- Keep this office fully updated on vessel's movements and cargo operations.
- Send daily operational reports throughout vessel's stay.
- Arrange crew change / husbandry as instructed.
- Prepare and submit Disbursement Account (PD/A) for approval prior vessel's arrival.
- Collect all relevant cargo documents before vessel's departure.

DISBURSEMENT ACCOUNT:
--------------------------------------------
- Submit PD/A for our approval prior vessel's arrival.
- Only official port tariffs to be applied.
- Only compulsory costs to be included.
- Agency fee to cover communication, postage, petties etc.
- For any 3rd party cost, please provide original supporting voucher.

PORT AGENCY FEE:
--------------------------------------------
- Agency fee to be in line with market level.
- Please advise your agency fee.

INVOICING INSTRUCTIONS:
--------------------------------------------
- Invoice to be issued and sent to:
${x.client}
c/o BADEN AGENCY
${BA_ADDRESS}
- As Agent Only -

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

PLEASE REVERT WITH PORT & OPERATIONAL INFO AS REQUESTED BELOW

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

HEALTH PROTOCOL:
- Please advise health protocol / procedure.
- Please advise if there are any particular restrictions.

ISPS & PFSO:
- Please advise ISPS security level.
- Please revert with name and contact details of PFSO.

TUG ASSISTANCE:
- Please advise if tug assistance is compulsory.
- If positive, please advise number of tug-boats and costs.

PILOTAGE:
- Please advise if pilotage is compulsory.

PORT INFO & RESTRICTIONS:
- Please advise safe anchorage position.
- Please advise pilot rendez-vous point.
- Please advise designated berth.
- Please advise MAX draft at designated berth.
- Please advise MAX LOA at designated berth.
- Please advise if tidal port.
- Please advise if daylight only navigation.

WORKING HOURS:
- Please advise port working hours.
- Please advise stevedore shift hours.

WATER DENSITY:
- Please advise water density.

MARPOL REGULATIONS:
- Please advise MARPOL regulations.
- Please advise if open loop scrubber system is allowed.

+++

Sake good order, we kindly ask you to confirm safe receipt of this message by return.`
}

const TEMPLATES = [
  { id: 'opa',       label: '🛡️ OPA Appointment',         fn: opaTemplate },
  { id: 'pag',       label: '⚓ Port Agency Appointment',  fn: pagTemplate },
  { id: 'arrival',   label: '📍 Arrival Notice',           fn: (op) => {
    const x = vals(op)
    return `Dear Sir/Madam,

We hereby give notice of the expected arrival of:

Vessel\t\t: ${x.v}
IMO\t\t\t: ${x.imo}
Flag\t\t\t: ${x.flag}
Type\t\t\t: ${x.vessel_type}
DWT\t\t\t: ${x.dwt}
Port\t\t\t: ${x.port}
ETA\t\t\t: ${x.eta}
ETB\t\t\t: ${x.etb}
Cargo\t\t: ${x.commodity}${x.commodity2 ? ' / ' + x.commodity2 : ''}
Quantity\t: ${x.quantity}${x.quantity2 ? ' / ' + x.quantity2 : ''}
Principal\t: ${x.client}
Reference\t: ${x.ref}

We will keep you updated with any changes to the ETA.

Kind regards,
Baden Agency`
  }},
  { id: 'departure', label: '🚢 Departure Notice',         fn: (op) => {
    const x = vals(op)
    return `Dear Sir/Madam,

We hereby give notice of the expected departure of:

Vessel\t\t: ${x.v}
Port\t\t\t: ${x.port}
ETD\t\t\t: ${x.etd}
Principal\t: ${x.client}
Reference\t: ${x.ref}

Please confirm all port formalities are in order prior departure.

Kind regards,
Baden Agency`
  }},
  { id: 'daily',     label: '📋 Daily Status Report',     fn: (op) => {
    const x = vals(op)
    return `Dear Sir/Madam,

Daily status report for ${x.v} at ${x.port}:

Vessel\t\t\t: ${x.v}
Port\t\t\t\t: ${x.port}
Status\t\t\t: ${op.vessel_status || '—'}
ETA\t\t\t\t: ${x.eta}
ETB\t\t\t\t: ${x.etb}
ETD\t\t\t\t: ${x.etd}
Sub-Agent\t\t: ${x.sub_agent}
Reference\t\t: ${x.ref}

OPERATIONS UPDATE:
[ADD UPDATE HERE]

CARGO UPDATE:
[ADD CARGO UPDATE HERE]

Kind regards,
Baden Agency`
  }},
  { id: 'nor',       label: '📄 NOR Tender',              fn: (op) => {
    const x = vals(op)
    const now = new Date()
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' LT'
    return `NOTICE OF READINESS

To: ${x.client}
    ${x.sub_agent}
cc: Baden Agency

Vessel\t\t\t: ${x.v}
Port\t\t\t\t: ${x.port}
Date\t\t\t\t: ${date}
Time\t\t\t\t: ${time}

Dear Sir/Madam,

We hereby tender Notice of Readiness on behalf of the Master and Owners of the ${x.v}.

The vessel is in all respects ready to commence [LOADING / DISCHARGING] of ${x.quantity} ${x.commodity} at ${x.port}.

NOR tendered: ${date} at ${time}

[ACCEPTED / NOT ACCEPTED] — [REASON IF NOT ACCEPTED]

Master: [MASTER NAME]
Agent: Baden Agency`
  }},
  { id: 'invoice',   label: '💰 Invoice Covering Letter', fn: (op) => {
    const x = vals(op)
    return `Dear Sir/Madam,

Please find enclosed our invoice for services rendered in connection with the above mentioned vessel's call at ${x.port}.

Vessel\t\t: ${x.v}
Port\t\t\t: ${x.port}
Reference\t: ${x.ref}
Principal\t: ${x.client}

Invoice details:
- Invoice No.: [INVOICE NUMBER]
- Invoice Date: [DATE]
- Amount: [AMOUNT] [CURRENCY]
- Due Date: [DUE DATE]

We kindly request payment within 30 days of receipt.

Please do not hesitate to contact us should you have any queries.

Kind regards,
Baden Agency
${BA_ADDRESS}
agency@baden-agency.com`
  }},
]

export default function Templates() {
  const { data: allOps }  = useOperations({ limit: 2000 })
  const { data: active }  = useActiveVessels()
  const [selectedOp, setSelectedOp]             = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customBody, setCustomBody]             = useState('')
  const [copied, setCopied]                     = useState(false)
  const [fullOp, setFullOp]                     = useState(null)

  const op       = fullOp || (selectedOp ? allOps.find(o => o.id === selectedOp) : null)
  const template = selectedTemplate ? TEMPLATES.find(t => t.id === selectedTemplate) : null
  const subject  = op && template ? `${op.vessel_name || ''} - ${op.port || ''} - ${template.label.replace(/^[^\w]+/, '')}` : ''

  const generateTemplate = (tid, operation) => {
    const t = TEMPLATES.find(t => t.id === tid)
    setCustomBody(t && operation ? t.fn(operation) : '')
  }

  const handleTemplateSelect = (tid) => {
    setSelectedTemplate(tid)
    setCopied(false)
    if (fullOp) generateTemplate(tid, fullOp)
    else if (op) generateTemplate(tid, op)
  }

  const handleOpSelect = async (id) => {
    setSelectedOp(id)
    setCopied(false)
    setFullOp(null)
    if (!id) return
    // Fetch full operation with all vessel particulars
    const { data } = await supabase.from('operations').select('*').eq('id', id).single()
    if (data) {
      setFullOp(data)
      if (selectedTemplate) generateTemplate(selectedTemplate, data)
    }
  }

  const copyBody = () => {
    navigator.clipboard.writeText(customBody)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openMail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customBody)}`
  }

  const exportCalendar = () => {
    const events = []
    allOps.forEach(op => {
      if (op.eta) events.push({ date: op.eta, title: `ETA — ${op.vessel_name} — ${op.port}`, ref: op.ref })
      if (op.etb) events.push({ date: op.etb, title: `ETB — ${op.vessel_name} — ${op.port}`, ref: op.ref })
      if (op.etd) events.push({ date: op.etd, title: `ETD — ${op.vessel_name} — ${op.port}`, ref: op.ref })
    })
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Baden Agency//EN','CALSCALE:GREGORIAN',
      ...events.map(e => {
        const d = e.date.replace(/-/g,'')
        return `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${d}\nDTEND;VALUE=DATE:${d}\nSUMMARY:${e.title}\nDESCRIPTION:${e.ref}\nUID:${e.ref}-${e.date}@badenagency\nEND:VEVENT`
      }),
      'END:VCALENDAR'].join('\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'baden-agency-schedule.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <h1>Templates</h1>
        <button onClick={exportCalendar} className="btn-secondary btn-sm">📅 Export to Calendar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Left panel */}
        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Template type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => handleTemplateSelect(t.id)} style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                  background: selectedTemplate === t.id ? 'var(--navy)' : 'var(--bg)',
                  color: selectedTemplate === t.id ? '#fff' : 'var(--text)',
                  transition: 'all 0.15s',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Vessel / Operation</div>
            <select value={selectedOp || ''} onChange={e => handleOpSelect(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select operation…</option>
              {active.length > 0 && (
                <optgroup label="— Active vessels —">
                  {active.map(o => <option key={o.id} value={o.id}>{o.vessel_name} · {o.port}</option>)}
                </optgroup>
              )}
              <optgroup label="— All operations —">
                {allOps.map(o => <option key={o.id} value={o.id}>{o.ref} · {o.vessel_name}</option>)}
              </optgroup>
            </select>
            {fullOp && (
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                ✓ Full details loaded<br/>
                {fullOp.imo && `IMO: ${fullOp.imo}`}{fullOp.flag && ` · ${fullOp.flag}`}<br/>
                {fullOp.vessel_type && fullOp.vessel_type}
                {fullOp.dwt && ` · ${fullOp.dwt} DWT`}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selectedTemplate || !selectedOp ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>✉️</div>
              <p>Select a template and vessel on the left to generate</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input value={subject} readOnly style={{ fontWeight: 600 }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Body — edit before sending</label>
                <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
                  rows={28} style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', lineHeight: 1.7, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={openMail} className="btn-primary" style={{ flex: 1 }}>✉️ Open in Mail</button>
                <button onClick={copyBody} className="btn-secondary" style={{ flex: 1 }}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
