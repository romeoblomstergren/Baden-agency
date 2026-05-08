import { useState } from 'react'
import { useOperations, useActiveVessels } from '../hooks/useOperations'
import { formatDate } from '../lib/constants'

const BA_ADDRESS = `Suite 1702, Level 17,
Boulevard Plaza Tower 1,
Sheikh Mohammed Bin Rashid Bld,
Downtown Dubai, Dubai, UAE
PO BOX 416654`

function opaTemplate(op) {
  const v = op.vessel_name || '[VESSEL NAME]'
  const port = op.port || '[PORT]'
  const eta = op.eta ? formatDate(op.eta) : '[PLEASE ADVISE]'
  const etb = op.etb ? formatDate(op.etb) : 'PLEASE ADVISE'
  const etd = op.etd ? formatDate(op.etd) : 'PLEASE ADVISE'
  const imo = op.imo || '[IMO]'
  const mmsi = op.mmsi || '[MMSI]'
  const client = op.client_name || '[PRINCIPAL]'
  const subAgent = op.sub_agent || '[SUB-AGENT]'

  return `${v} - ${port} - [OPERATION TYPE] - [QUANTITY] [COMMODITY]

TO: ${subAgent.toUpperCase()} - AGENCY DEPT.
FM: BADEN AGENCY - [OPERATOR NAME] - SERVICE PROVIDER
---------------------------------------------------------------------------------------------------------------------------------------------------
PORT                             \t- ${port}
CARGO                         \t- [COMMODITY]
QUANTITY                     \t- [QUANTITY]
ETA\t\t\t\t\t- ${eta} AGW. WP. @ ${port} ANCHORAGE
POB                               \t- PLEASE ADVISE
ETB                               \t- ${etb}
OPS. EXP. TO START    - PLEASE ADVISE
TURN-AROUND\t\t- PLEASE ADVISE
ETS\t\t\t\t\t- ${etd}
---------------------------------------------------------------------------------------------------------------------------------------------------

Ref. [correspondence reference], we hereby appoint ${subAgent} to act as protective agent for and on behalf of BADEN AGENCY for subject mentioned vessel's forthcoming call at ${port} for [operation type] [quantity] [commodity] under [terms] terms.

Please advise designated berth/s and MAX draft at each estimated berth. Please also advise daily average [discharging/loading] rate at each designated berth.

Please be our eyes and ears on the ground.

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

APPOINTMENT - SUPER CARGO - SCOPE OF WORK + REPORTING & SOF INSTRUCTIONS

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

OPERATIONAL DETAILS:
------------------------------------
Vessel\t\t\t\t: ${v}
Port\t\t\t\t\t: ${port}
Terms\t\t\t\t: [TERMS]
C/P Date\t\t\t\t: [PLEASE ADVISE]
NOR\t\t\t\t\t: N/A
ETB\t\t\t\t\t: ${etb}
ETC/S\t\t\t\t: PLEASE ADVISE
Operation\t\t\t: [DISCHARGING / LOADING]
Berth(s)\t\t\t\t: 1 SPSB ${port}
Cargo\t\t\t\t: [COMMODITY]
Quantity\t\t\t\t: [QUANTITY]

VESSEL DETAILS:
--------------------------
IMO\t\t\t\t\t: ${imo}
Name\t\t\t\t: ${v}
Detailed vessel type\t: [VESSEL TYPE]
MMSI\t\t\t\t: ${mmsi}
Call sign\t\t\t\t: [CALL SIGN]
Flag\t\t\t\t\t: [FLAG]
Gross Tonnage\t\t: [GT] MTS.
DWT\t\t\t\t\t: [DWT] MTS.
Length Overall\t\t: [LOA] M.
Breadth Extreme\t\t: [BEAM] M.
Year built\t\t\t\t: [YEAR]

COMMUNICATION DETAILS:
-----------------------------------------
MASTER
Call sign\t\t\t\t: [CALL SIGN]

RECEIVER'S AGENT:
-------------------------------
[RECEIVER AGENT NAME]

PIC\t\t\t\t\t: [NAME] / AGENCY DEPT.
Mail\t\t\t\t\t: [EMAIL]
Mobile\t\t\t\t: [PHONE]

COMMUNICATIONS INSTRUCTIONS:
----------------------------------------------------
- Please keep below mailing list fully up-dated on berthing/[loading/discharging] prospects as well as all other matters concerning this call.
- For urgent matters please call this office at any time!

MAILING LIST:
---------------------
Baden Agency LLC

PIC\t\t\t\t\t: [OPERATOR NAME]
Mail\t\t\t\t\t: agency@baden-agency.com

SCOPE OF WORK:
---------------------------
- Liaise with Receiver's agent in order to ensure that pre-arrival formalities are duly taken care of.
- Screen Receiver's agent's PD/A in order to ensure that only official tariffs are applied, that only compulsory costs are included, that no extra costs are added and that applied agency fee is in line with market level.
- Have a boarding agent on the ground every working day throughout the cargo operation monitoring the operation as many hours as possible.
- Liaise with Receiver's agent / Stevedore Foreman / Receiver in order to be fully on top of the cargo operation and keep this office up-dated accordingly.
- Monitor, record and report ANY/ALL stoppages/delays and ensure that remarks are inserted in SOF accordingly.
- Present intermediary SOF to the Master on a regular basis throughout the operation, in order to ensure that SOF is issued in accordance with Captain's Log.
- Send 2 (two) daily operational reports every working day throughout the cargo operation.
\t1) AM report\t- To be send before noontime.
\t2) PM report\t- To be send latest 12 hrs. after AM report.
- Report any incident to this office that has any in/direct impact on the cargo operation.
- Send SOF draft to this office for approval MIN. 24 hrs. before expected completion of cargo operation.

DISBURSEMENT ACCOUNT:
-----------------------------------------
[FREE OUT / LINER IN]

- ANY / ALL cargo related costs to be for Chrtr's / Receiver's account.
- ANY / ALL taxes / dues levied (calculated) on freight (cargo) to be for Chrtr's / Receiver's account.
- ANY / ALL taxes / dues levied (calculated) on freight vessel to be for (Disp.) Owner's account.
- Only official port tariffs to be applied.
- Only compulsory costs to be included in Chrtrs' agents' PD/A.
- No overtime costs to be included - if overtime applicable same to be settled in FD/A.
- Chrtrs' agents' agency fee to cover communication, postage, petties etc. NO extras will be accepted.

AGENCY FEE:
---------------------
Please screen Receiver's agent's agency fee.
- Agency fee to include/cover communication, postage, petties etc. NO extras will be accepted.
- Agency fee to be in line with market level.

BILL OF LADING:
-------------------------
- Please check whereabouts of OBL with Chrtrs./Receivers and advise if OBL expected to be available for presentation to the Master upon vessel's arrival.

PROTECTIVE AGENCY FEE:
-----------------------------------------
- OPA Fee [AMOUNT] ALL IN LUMPSUM INCL. VAT agreed.

INVOICING INSTRUCTIONS:
----------------------------------------
- Any additional port expenses as well as Husbandry enquiries to be quoted to BADEN AGENCY LLC only, and always to be accepted by BADEN AGENCY LLC prior rendering the service.
- As agreed OPA Fee [AMOUNT] ALL IN LUMPSUM INCL. VAT to apply.

- Invoice to be issued and send to:
${client}
c/o BADEN AGENCY
${BA_ADDRESS}
- As Agent Only -

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

PLEASE REVERT WITH PORT & OPERATIONAL INFO AS REQUESTED BELOW

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

HEALTH PROTOCOL:
-------------------------------
- Please advise health protocol / procedure.
- Please advise if there are any particular restrictions to take into consideration.

ISPS & PFSO:
--------------------
- Please advise ISPS security level.
- Please revert with name and contact details of PFSO.

TUG ASSISTANCE:
---------------------------
- Please advise if tug assistance is compulsory.
- If positive please advise number of tug-boats to be engaged and costs.

PILOTAGE:
----------------
- Please advise if pilotage is compulsory.

PORT INFO & RESTRICTIONS:
--------------------------------------------
- Please advise safe anchorage position.
- Please advise pilot rendez-vous point.
- Please advise designated berth.
- Please revert with port info and restrictions.
- Please advise if the port is a tidal port - IF positive, please send tide-table/link.
- Please advise MAX draft at designated berth.
- Please advise MAX air-draft - IF applicable.
- Please advise MAX LOA at designated berth.
- Please advise MAX beam at designated berth - IF applicable.
- Please advise if the port is first come, first served.
- Please advise if the port is a daylight only navigation port.

WORKING HOURS:
----------------------------
- Please advise port working hours.
- Please advise how many shifts stevedore/dockers will be working per day.
- Please advise working hours per shift.

DISCHARGING RATE:
--------------------------------
- Please advise MAX daily discharging rate as well as customary daily discharging rate.

DISCHARGING METHOD:
-------------------------------------
- Please advise if cargo will be discharged by vessel's gear or shore cranes.
- Discharging to pier / to trucks / to trucks via hoppers / to wagons / to silos / to barges.

WATER DENSITY:
-------------------------
- Please advise water density.

MARPOL REGULATIONS & OPEN LOOP SCRUBBERS:
-----------------------------------------------------------------------------
- Please advise port regulations pertaining to ballast exchange, Quarantine/health regulations/MARPOL.
- Please advise if the use of open loop scrubber system is allowed.

+++

Sake good order, we kindly ask you to confirm safe receipt of this message by return.`
}

function pagTemplate(op) {
  const v = op.vessel_name || '[VESSEL NAME]'
  const port = op.port || '[PORT]'
  const eta = op.eta ? formatDate(op.eta) : '[PLEASE ADVISE]'
  const etb = op.etb ? formatDate(op.etb) : 'PLEASE ADVISE'
  const etd = op.etd ? formatDate(op.etd) : 'PLEASE ADVISE'
  const imo = op.imo || '[IMO]'
  const mmsi = op.mmsi || '[MMSI]'
  const client = op.client_name || '[PRINCIPAL]'

  return `${v} - ${port} - PORT AGENCY APPOINTMENT - [OPERATION TYPE]

TO: [PORT AGENT NAME] - AGENCY DEPT.
FM: BADEN AGENCY - [OPERATOR NAME] - ON BEHALF OF ${client.toUpperCase()}
---------------------------------------------------------------------------------------------------------------------------------------------------
PORT                             \t- ${port}
CARGO                         \t- [COMMODITY]
QUANTITY                     \t- [QUANTITY]
ETA\t\t\t\t\t- ${eta} AGW. WP.
ETB                               \t- ${etb}
ETS\t\t\t\t\t- ${etd}
---------------------------------------------------------------------------------------------------------------------------------------------------

Dear Sir/Madam,

We hereby appoint you to act as Port Agent for and on behalf of ${client} / BADEN AGENCY for subject mentioned vessel's forthcoming call at ${port}.

OPERATIONAL DETAILS:
------------------------------------
Vessel\t\t\t\t: ${v}
Port\t\t\t\t\t: ${port}
IMO\t\t\t\t\t: ${imo}
MMSI\t\t\t\t: ${mmsi}
Operation\t\t\t: [DISCHARGING / LOADING]
Cargo\t\t\t\t: [COMMODITY]
Quantity\t\t\t\t: [QUANTITY]
ETA\t\t\t\t\t: ${eta}
ETB\t\t\t\t\t: ${etb}
ETD\t\t\t\t\t: ${etd}

PRINCIPAL:
------------------
${client}

MAILING LIST:
---------------------
Baden Agency LLC
PIC\t\t\t\t\t: [OPERATOR NAME]
Mail\t\t\t\t\t: agency@baden-agency.com

SCOPE OF WORK:
---------------------------
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
-----------------------------------------
- Please submit PD/A for our approval prior vessel's arrival.
- Only official port tariffs to be applied.
- Only compulsory costs to be included.
- Agency fee to cover communication, postage, petties etc. NO extras will be accepted.
- For any 3rd party cost, please provide original supporting voucher.

PORT AGENCY FEE:
------------------------------
- Agency fee to be in line with market level.
- Please advise your agency fee.

INVOICING INSTRUCTIONS:
----------------------------------------
- Invoice to be issued and sent to:
${client}
c/o BADEN AGENCY
${BA_ADDRESS}
- As Agent Only -

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

PLEASE REVERT WITH PORT & OPERATIONAL INFO AS REQUESTED BELOW

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

HEALTH PROTOCOL:
-------------------------------
- Please advise health protocol / procedure.
- Please advise if there are any particular restrictions to take into consideration.

ISPS & PFSO:
--------------------
- Please advise ISPS security level.
- Please revert with name and contact details of PFSO.

TUG ASSISTANCE:
---------------------------
- Please advise if tug assistance is compulsory.
- If positive please advise number of tug-boats to be engaged and costs.

PILOTAGE:
----------------
- Please advise if pilotage is compulsory.

PORT INFO & RESTRICTIONS:
--------------------------------------------
- Please advise safe anchorage position.
- Please advise pilot rendez-vous point.
- Please advise designated berth.
- Please advise MAX draft at designated berth.
- Please advise MAX LOA at designated berth.
- Please advise if the port is a tidal port.
- Please advise if daylight only navigation port.

WORKING HOURS:
----------------------------
- Please advise port working hours.
- Please advise stevedore shift hours.

WATER DENSITY:
-------------------------
- Please advise water density.

MARPOL REGULATIONS:
------------------------------------
- Please advise MARPOL regulations.
- Please advise if open loop scrubber system is allowed.

+++

Sake good order, we kindly ask you to confirm safe receipt of this message by return.`
}

const TEMPLATES = [
  { id: 'opa',       label: '🛡️ OPA Appointment',      fn: opaTemplate },
  { id: 'pag',       label: '⚓ Port Agency Appointment', fn: pagTemplate },
  { id: 'arrival',   label: '📍 Arrival Notice',         fn: (op) => `Dear Sir/Madam,\n\nWe hereby give notice of the expected arrival of:\n\nVessel: ${op.vessel_name || '—'}\nPort: ${op.port || '—'}\nETA: ${op.eta ? formatDate(op.eta) : '[PLEASE ADVISE]'}\nPrincipal: ${op.client_name || '—'}\nReference: ${op.ref || '—'}\n\nWe will keep you updated with any changes to the ETA.\n\nKind regards,\nBaden Agency` },
  { id: 'departure', label: '🚢 Departure Notice',       fn: (op) => `Dear Sir/Madam,\n\nWe hereby give notice of the expected departure of:\n\nVessel: ${op.vessel_name || '—'}\nPort: ${op.port || '—'}\nETD: ${op.etd ? formatDate(op.etd) : '[PLEASE ADVISE]'}\nPrincipal: ${op.client_name || '—'}\nReference: ${op.ref || '—'}\n\nPlease confirm all port formalities are in order.\n\nKind regards,\nBaden Agency` },
  { id: 'daily',     label: '📋 Daily Status Report',   fn: (op) => `Dear Sir/Madam,\n\nDaily status report for ${op.vessel_name || '—'}:\n\nVessel: ${op.vessel_name || '—'}\nPort: ${op.port || '—'}\nStatus: ${op.vessel_status || '—'}\nETA: ${op.eta ? formatDate(op.eta) : '—'}\nETB: ${op.etb ? formatDate(op.etb) : '—'}\nETD: ${op.etd ? formatDate(op.etd) : '—'}\nReference: ${op.ref || '—'}\n\nOperations update:\n[ADD UPDATE HERE]\n\nSub-agent: ${op.sub_agent || '—'}\n\nKind regards,\nBaden Agency` },
  { id: 'cargo',     label: '📦 Cargo Confirmation',    fn: (op) => `Dear Sir/Madam,\n\nWe hereby confirm the cargo details for:\n\nVessel: ${op.vessel_name || '—'}\nPort: ${op.port || '—'}\nPrincipal: ${op.client_name || '—'}\nReference: ${op.ref || '—'}\n\nCargo details:\n- Commodity: [ADD COMMODITY]\n- Quantity: [ADD QUANTITY]\n- ETC: [ADD ETC]\n\nKind regards,\nBaden Agency` },
  { id: 'invoice',   label: '💰 Invoice Covering Letter', fn: (op) => `Dear Sir/Madam,\n\nPlease find enclosed our invoice for services rendered:\n\nVessel: ${op.vessel_name || '—'}\nPort: ${op.port || '—'}\nReference: ${op.ref || '—'}\nInvoice amount: [ADD AMOUNT]\n\nWe kindly request payment within 30 days of receipt.\n\nKind regards,\nBaden Agency` },
]

export default function Templates() {
  const { data: allOps } = useOperations({ limit: 2000 })
  const { data: active } = useActiveVessels()
  const [selectedOp, setSelectedOp]           = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customBody, setCustomBody]             = useState('')
  const [copied, setCopied]                     = useState(false)

  const op       = selectedOp       ? allOps.find(o => o.id === selectedOp) : null
  const template = selectedTemplate ? TEMPLATES.find(t => t.id === selectedTemplate) : null
  const subject  = op ? `${op.vessel_name || ''} - ${op.port || ''} - ${template?.label?.replace(/^[^\w]+/, '') || ''}` : ''
  const body     = customBody

  const handleTemplateSelect = (tid) => {
    setSelectedTemplate(tid)
    setCopied(false)
    if (op) {
      const t = TEMPLATES.find(t => t.id === tid)
      setCustomBody(t ? t.fn(op) : '')
    }
  }

  const handleOpSelect = (id) => {
    setSelectedOp(id)
    setCopied(false)
    if (selectedTemplate) {
      const t = TEMPLATES.find(t => t.id === selectedTemplate)
      const operation = allOps.find(o => o.id === id)
      setCustomBody(t && operation ? t.fn(operation) : '')
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
        <button onClick={exportCalendar} className="btn-secondary btn-sm">📅 Export to Apple Calendar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Left */}
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
          </div>
        </div>

        {/* Right */}
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
