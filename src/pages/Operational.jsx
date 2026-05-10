import { useState, useEffect } from 'react'
import LivePosition from '../components/LivePosition'
import { useAIContext } from '../context/AIContext'
import { Link } from 'react-router-dom'
import { useActiveVessels, useOperations } from '../hooks/useOperations'
import { useTasks, DEFAULT_TASKS, CATEGORY_LABELS } from '../hooks/useTasks'
import { VesselStatusBadge, EntryStatusBadge, OpTypeBadge } from '../components/Layout'
import EditPanel from '../components/EditPanel'
import TrackingModal from '../components/TrackingModal'
import Alerts from '../components/Alerts'
import LiveMap from '../components/LiveMap'
import { supabase } from '../lib/supabase'
import { formatDate, formatMoney, VESSEL_STATUSES, ENTRY_STATUSES, OP_TYPES, CURRENT_YEAR } from '../lib/constants'

const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i)
const KANBAN_COLUMNS = [
  { status: 'Alongside', color: 'var(--amber)', bg: 'var(--amber-bg)', dot: '🟡' },
  { status: 'At Anchorage',   color: 'var(--blue)',  bg: 'var(--blue-bg)',  dot: '🔵' },
  { status: 'Underway',  color: 'var(--green)', bg: 'var(--green-bg)', dot: '🟢' },
]

function pct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

function KPICard({ label, value, prev, format = 'number' }) {
  const change = pct(value, prev)
  const up = change >= 0
  const formatted = format === 'currency' ? '$' + Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(value)
  return (
    <div className="card" style={{ padding: '14px 18px', flex: 1 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{formatted}</div>
      <div style={{ fontSize: '0.72rem', marginTop: 6, color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
        {up ? '↑' : '↓'} {Math.abs(change)}% vs last month
      </div>
    </div>
  )
}

function DashboardKPIs() {
  const [curr, setCurr] = useState(null)
  const [prev, setPrev] = useState(null)
  useEffect(() => {
    async function load() {
      const now = new Date()
      const thisYear  = now.getFullYear()
      const thisMonth = now.getMonth() + 1
      const lastYear  = thisMonth === 1 ? thisYear - 1 : thisYear
      const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1
      const pad = n => String(n).padStart(2, '0')
      const thisStart = thisYear + '-' + pad(thisMonth) + '-01'
      const thisEnd   = thisMonth === 12 ? (thisYear+1) + '-01-01' : thisYear + '-' + pad(thisMonth+1) + '-01'
      const lastStart = lastYear  + '-' + pad(lastMonth) + '-01'
      const lastEnd   = lastMonth === 12 ? (lastYear+1) + '-01-01' : lastYear + '-' + pad(lastMonth === 12 ? 1 : lastMonth+1) + '-01'
      const [thisRes, lastRes] = await Promise.all([
        supabase.from('operations').select('id, vessel_status, net', { count: 'exact' })
          .gte('op_date', thisStart).lt('op_date', thisEnd),
        supabase.from('operations').select('id, vessel_status, net', { count: 'exact' })
          .gte('op_date', lastStart).lt('op_date', lastEnd),
      ])
      const summarise = (res) => ({
        total:   res.count ?? 0,
        active:  (res.data ?? []).filter(o => !['Sailed','Completed'].includes(o.vessel_status)).length,
        revenue: (res.data ?? []).reduce((s, o) => s + (o.net ?? 0), 0),
      })
      setCurr(summarise(thisRes)); setPrev(summarise(lastRes))
    }
    load()
  }, [])
  if (!curr || !prev) return null
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      <KPICard label="Operations this month" value={curr.total}   prev={prev.total} />
      <KPICard label="Active vessels"         value={curr.active}  prev={prev.active} />
      <KPICard label="Net revenue this month" value={curr.revenue} prev={prev.revenue} format="currency" />
    </div>
  )
}

function DuplicateButton({ op, onDone }) {
  const [loading, setLoading] = useState(false)
  async function handle(e) {
    e.stopPropagation()
    if (!confirm('Duplicate "' + op.vessel_name + '"?')) return
    setLoading(true)
    const { id, created_at, updated_at, ref, ...rest } = op
    await supabase.from('operations').insert([{ ...rest, vessel_name: rest.vessel_name + ' (Copy)', vessel_status: 'Alongside', eta: null, etb: null, etd: null }])
    setLoading(false); onDone()
  }
  return (
    <button onClick={handle} disabled={loading} className="btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} title="Duplicate">
      {loading ? '…' : '⧉'}
    </button>
  )
}

function TaskPanel({ operation, onClose }) {
  const { tasks, loading, initTasks, toggleTask, updateTaskTime, updateResetsDaily, addTask, deleteTask, clearAll, completedCount, total } = useTasks(operation.id)
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const hasDefaults = !!DEFAULT_TASKS[operation.vessel_status]
  const handleAdd = async () => {
    if (!newTask.trim()) return
    setAdding(true); await addTask(newTask.trim()); setNewTask(''); setAdding(false)
  }
  const grouped = tasks.reduce((acc, t) => { const cat = t.category||'custom'; if(!acc[cat]) acc[cat]=[]; acc[cat].push(t); return acc }, {})
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'var(--surface)', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', animation: 'slideIn 0.22s ease' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{operation.ref}</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>{operation.vessel_name || '—'}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 2 }}>{operation.port || '—'} · {operation.vessel_status || 'No status'}</div>
          </div>
          {total > 0 && (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{completedCount}/{total}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', marginTop: 2 }}>done</div>
            </div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {total > 0 && <div style={{ height: 4, background: 'var(--border)' }}><div style={{ height: '100%', width: ((completedCount/total)*100)+'%', background: 'var(--green)', transition: 'width 0.3s' }} /></div>}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? <div className="spinner" /> : (<>
            {tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No tasks yet</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>{hasDefaults ? 'Load default tasks for "'+operation.vessel_status+'" or add your own.' : 'Add tasks below.'}</div>
                {hasDefaults && <button onClick={() => initTasks(operation.vessel_status)} className="btn-primary btn-sm">Load default tasks for {operation.vessel_status}</button>}
              </div>
            )}
            {Object.entries(grouped).map(([cat, catTasks]) => {
              const info = CATEGORY_LABELS[cat] || CATEGORY_LABELS.custom
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: info.bg, color: info.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{info.label}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{catTasks.filter(t=>t.done).length}/{catTasks.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catTasks.map(t => (
                      <div key={t.id} style={{ padding: '10px 12px', borderRadius: 8, background: t.done ? 'var(--green-bg)' : 'var(--bg)', border: '1px solid '+(t.done?'rgba(26,94,56,0.2)':'var(--border)'), transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <input type="checkbox" checked={!!t.done} onChange={e => toggleTask(t.id, e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--green)', flexShrink: 0, cursor: 'pointer' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 500, textDecoration: t.done?'line-through':'none', color: t.done?'var(--muted)':'var(--text)' }}>{t.task}</div>
                            {t.done_at && <div style={{ fontSize: '0.7rem', color: 'var(--green)', marginTop: 2 }}>✓ {new Date(t.done_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>}
                          </div>
                          <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 2px', opacity: 0.5 }}>🗑</button>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', paddingLeft: 26 }}>
                          <input type="datetime-local" value={t.task_time?new Date(t.task_time).toISOString().slice(0,16):''} onChange={e=>updateTaskTime(t.id,e.target.value?new Date(e.target.value).toISOString():null)} style={{ fontSize: '0.72rem', padding: '3px 6px', flex: 1, fontFamily: 'var(--mono)' }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={!!t.resets_daily} onChange={e=>updateResetsDaily(t.id,e.target.checked)} style={{ accentColor: 'var(--blue)', cursor: 'pointer' }} />
                            Daily reset
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>)}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: tasks.length > 0 ? 12 : 0 }}>
            <input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a custom task…" onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleAdd()} style={{ flex: 1 }} />
            <button onClick={handleAdd} disabled={adding||!newTask.trim()} className="btn-primary btn-sm">{adding?'…':'Add'}</button>
          </div>
          {tasks.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!confirming ? (
                <button onClick={() => setConfirming(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>Clear all tasks…</button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>Clear all?</span>
                  <button onClick={async()=>{await clearAll();setConfirming(false)}} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>Yes</button>
                  <button onClick={()=>setConfirming(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
              <button onClick={onClose} className="btn-secondary btn-sm">Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
}

function ETABadge({ label, dateStr }) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  const isOverdue = days < 0, isToday = days === 0, isSoon = days > 0 && days <= 2
  const bg    = isOverdue ? 'var(--red-bg)'  : isToday ? 'var(--amber-bg)' : isSoon ? '#FFF8E1' : 'var(--bg)'
  const color = isOverdue ? 'var(--red)'     : isToday ? 'var(--amber)'    : isSoon ? '#854F0B' : 'var(--navy)'
  const countdown = isOverdue ? Math.abs(days)+'d overdue' : isToday ? 'Today' : 'in '+days+'d'
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '5px 10px', fontSize: '0.78rem', border: isOverdue?'1px solid var(--red)':'none' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'block' }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{formatDate(dateStr)}</span>
      <span style={{ fontSize: '0.68rem', color, marginLeft: 4, fontWeight: 600 }}>({countdown})</span>
    </div>
  )
}

function KanbanCard({ op, onEdit, onTasks, onTrack, onDuplicated, color }) {
  const etdDays = daysUntil(op.etd)
  const isOverdue = op.etd && etdDays < 0 && op.vessel_status !== 'Sailed'
  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px', borderTop: '3px solid '+(isOverdue?'var(--red)':color) }}>
      {isOverdue && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', borderRadius: 6, marginBottom: 10 }}>⚠️ ETD overdue by {Math.abs(etdDays)} day{Math.abs(etdDays)!==1?'s':''}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <OpTypeBadge code={op.op_type} /><EntryStatusBadge status={op.entry_status} />
          </div>
          <Link to={'/vessels/' + encodeURIComponent(op.vessel_name)} style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, color: 'var(--text)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--blue)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text)'}>
            {op.vessel_name || '—'}
          </Link>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>{op.ref}</span>
      </div>
      {op.port && <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>📍 {op.port}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <ETABadge label="ETA" dateStr={op.eta} />
        <ETABadge label="ETB" dateStr={op.etb} />
        <ETABadge label="ETD" dateStr={op.etd} />
      </div>
      {(op.mmsi || op.imo) && <LivePosition mmsi={op.mmsi} imo={op.imo} inline />}
      {op.client_name && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>👤 {op.client_name}</div>}
      {op.sub_agent    && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>🤝 {op.sub_agent}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onTrack(op)} className="btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem' }}>🚢</button>
        <button onClick={() => onTasks(op)} className="btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem' }}>📋</button>
        <button onClick={() => onEdit(op)}  className="btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem' }}>✏️</button>
        <DuplicateButton op={op} onDone={onDuplicated} />
      </div>
    </div>
  )
}

export default function Operational() {
  const { data: active, loading: loadingActive, refetch: refetchActive } = useActiveVessels()
  const { setContext } = useAIContext()
  useEffect(() => { setContext({ operations: active }) }, [active])
  const [filters, setFilters] = useState({ year: CURRENT_YEAR })
  const [search, setSearch]   = useState('')
  const { data: allOps, loading: loadingAll, refetch: refetchAll } = useOperations({ ...filters, ...(search ? { search } : {}) })
  const [editOp, setEditOp]   = useState(null)
  const [activeFilter, setActiveFilter] = useState(null)
  const [taskOp, setTaskOp]   = useState(null)
  const [trackOp, setTrackOp] = useState(null)
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v || undefined }))
  const onSaved = () => { refetchActive(); refetchAll() }
  const filteredActive = activeFilter ? active.filter(v => v.operator === activeFilter) : active
  const grouped = KANBAN_COLUMNS.reduce((acc, col) => { acc[col.status] = filteredActive.filter(v => v.vessel_status === col.status); return acc }, {})

  return (
    <div className="page">
      <Alerts />
      <DashboardKPIs />
      <div style={{ marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h1>Active Vessels</h1>
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{loadingActive ? '…' : filteredActive.length+' active'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['All', 'Nicolai Baden', 'Romeo Baden'].map(op => (
            <button key={op} onClick={() => setActiveFilter(op === 'All' ? null : op)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: activeFilter===(op==='All'?null:op)?'var(--navy)':'var(--surface)', color: activeFilter===(op==='All'?null:op)?'#fff':'var(--muted)', border: '1px solid var(--border)' }}>
              {op}
            </button>
          ))}
        </div>
        {loadingActive ? <div className="spinner" /> : active.length === 0 ? (
          <div className="card empty"><div className="empty-icon">⚓</div><p>No active vessels right now.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {KANBAN_COLUMNS.map(col => {
              const vessels = grouped[col.status] || []
              return (
                <div key={col.status}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: col.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: '0.85rem' }}>{col.dot}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: col.color }}>{col.status}</span>
                    <span style={{ marginLeft: 'auto', background: col.color, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{vessels.length}</span>
                  </div>
                  {vessels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: '0.82rem', border: '2px dashed var(--border)', borderRadius: 8 }}>No vessels</div>
                  ) : vessels.map(op => (
                    <KanbanCard key={op.id} op={op} color={col.color} onEdit={setEditOp} onTasks={setTaskOp} onTrack={setTrackOp} onDuplicated={onSaved} />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <LiveMap />
      <div>
        <h2 style={{ marginBottom: 12 }}>All Operations</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input placeholder="Search vessel, port, client, ref…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <select value={filters.year||''} onChange={e=>setFilter('year',e.target.value?Number(e.target.value):undefined)} style={{ width: 'auto' }}>
            <option value="">All years</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.op_type||''} onChange={e=>setFilter('op_type',e.target.value)} style={{ width: 'auto' }}>
            <option value="">All types</option>{OP_TYPES.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}
          </select>
          <select value={filters.vessel_status||''} onChange={e=>setFilter('vessel_status',e.target.value)} style={{ width: 'auto' }}>
            <option value="">All vessel statuses</option>{VESSEL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.entry_status||''} onChange={e=>setFilter('entry_status',e.target.value)} style={{ width: 'auto' }}>
            <option value="">All entry statuses</option>{ENTRY_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.operator||''} onChange={e=>setFilter('operator',e.target.value)} style={{ width: 'auto' }}>
            <option value="">All operators</option>
            <option value="Nicolai Baden">Nicolai Baden</option>
            <option value="Romeo Baden">Romeo Baden</option>
          </select>
        </div>
        {loadingAll ? <div className="spinner" /> : allOps.length === 0 ? (
          <div className="card empty"><div className="empty-icon">📭</div><p>No operations found.</p></div>
        ) : (<>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>{allOps.length} result{allOps.length!==1?'s':''}</div>
          <div className="card"><div className="table-wrap"><table>
            <thead><tr><th>Ref</th><th>Type</th><th>Vessel</th><th>Port</th><th>Client</th><th>Date</th><th>Vessel status</th><th>Entry status</th><th>Operator</th><th>Net</th><th></th></tr></thead>
            <tbody>
              {allOps.map(op => (
                <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => setEditOp(op)}>
                  <td><span className="ref">{op.ref}</span></td>
                  <td><OpTypeBadge code={op.op_type} /></td>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <Link to={'/vessels/'+encodeURIComponent(op.vessel_name)} onClick={e=>e.stopPropagation()} style={{ color: 'var(--text)', textDecoration: 'none' }}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--blue)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text)'}>
                      {op.vessel_name||'—'}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{op.port||'—'}</td>
                  <td style={{ color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.client_name||'—'}</td>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(op.op_date)}</td>
                  <td><VesselStatusBadge status={op.vessel_status} /></td>
                  <td><EntryStatusBadge status={op.entry_status} /></td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{op.operator||'—'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: op.net>=0?'var(--green)':'var(--red)' }}>{op.net!=null?formatMoney(op.net,op.inv_currency):'—'}</td>
                  <td onClick={e=>{e.stopPropagation();setTrackOp(op)}}><button className="btn-secondary btn-sm">🚢</button></td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        </>)}
      </div>
      {editOp  && <EditPanel operation={editOp} onClose={() => setEditOp(null)} onSaved={onSaved} />}
      {taskOp  && <TaskPanel operation={taskOp} onClose={() => setTaskOp(null)} />}
      {trackOp && <TrackingModal operation={trackOp} onClose={() => setTrackOp(null)} />}
    </div>
  )
}
