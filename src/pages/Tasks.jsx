import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const USERS = ['Nicolai Baden', 'Romeo Baden']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const PRIORITY_STYLE = {
  low:    { color: '#6b7280', bg: '#f3f4f6',          label: 'Low',    dot: '⚪' },
  normal: { color: 'var(--blue)',  bg: 'var(--blue-bg)',  label: 'Normal', dot: '🔵' },
  high:   { color: 'var(--amber)', bg: 'var(--amber-bg)', label: 'High',   dot: '🟡' },
  urgent: { color: 'var(--red)',   bg: 'var(--red-bg)',   label: 'Urgent', dot: '🔴' },
}
const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#6b7280' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--amber)' },
  { id: 'done',        label: 'Done',        color: 'var(--green)' },
]

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000)
}

function TaskCard({ task, onEdit, onStatusChange, onPass }) {
  const ps = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.normal
  const days = daysUntil(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const isDueToday = days === 0

  return (
    <div onClick={() => onEdit(task)} style={{
      background: 'var(--surface)',
      border: `1px solid ${isOverdue ? 'var(--red)' : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      borderLeft: `4px solid ${ps.color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.15s',
      opacity: task.status === 'done' ? 0.7 : 1,
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.1)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}>

      {/* Title + priority */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.87rem', lineHeight: 1.3, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--muted)' : 'var(--text)' }}>
            {task.title}
          </div>
          {task.description && (
            <div style={{ color: 'var(--muted)', fontSize: '0.76rem', marginTop: 3, lineHeight: 1.4 }}>
              {task.description.slice(0, 90)}{task.description.length > 90 ? '…' : ''}
            </div>
          )}
        </div>
        <span style={{ background: ps.bg, color: ps.color, fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {ps.dot} {ps.label}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        {task.assigned_to && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
            👤 {task.assigned_to.split(' ')[0]}
          </span>
        )}
        {task.created_by && task.created_by !== task.assigned_to && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            from {task.created_by.split(' ')[0]}
          </span>
        )}
        {task.operation_ref && (
          <span style={{ fontSize: '0.7rem', color: 'var(--blue)', fontFamily: 'var(--mono)', background: 'var(--blue-bg)', padding: '2px 8px', borderRadius: 20 }}>
            {task.operation_ref}
          </span>
        )}
        {task.due_date && (
          <span style={{ fontSize: '0.7rem', fontWeight: isOverdue || isDueToday ? 700 : 400, color: isOverdue ? 'var(--red)' : isDueToday ? 'var(--amber)' : 'var(--muted)' }}>
            📅 {isOverdue ? `${Math.abs(days)}d overdue` : isDueToday ? 'Due today' : `${days}d`}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        {COLUMNS.filter(c => c.id !== task.status).map(c => (
          <button key={c.id} onClick={() => onStatusChange(task.id, c.id)}
            style={{ fontSize: '0.67rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--muted)', flex: 1 }}>
            {c.id === 'done' ? '✓ Done' : c.id === 'in_progress' ? '▶ Start' : '← Back'}
          </button>
        ))}
        {/* Pass button */}
        {USERS.filter(u => u !== task.assigned_to).map(u => (
          <button key={u} onClick={() => onPass(task.id, u)}
            style={{ fontSize: '0.67rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--blue)', background: 'var(--blue-bg)', cursor: 'pointer', color: 'var(--blue)', whiteSpace: 'nowrap' }}>
            → {u.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  )
}

function TaskModal({ task, onClose, onSaved }) {
  const isNew = !task?.id
  const [form, setForm] = useState(task || {
    title: '', description: '', status: 'todo', priority: 'normal',
    assigned_to: '', created_by: '', operation_id: null, due_date: '',
  })
  const [saving, setSaving]     = useState(false)
  const [operations, setOps]    = useState([])

  useEffect(() => {
    supabase.from('operations').select('id,ref,vessel_name,port').order('op_date', { ascending: false }).limit(200)
      .then(({ data }) => setOps(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title?.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(), description: form.description || null,
        status: form.status || 'todo', priority: form.priority || 'normal',
        assigned_to: form.assigned_to || null, created_by: form.created_by || null,
        operation_id: form.operation_id || null, due_date: form.due_date || null,
        updated_at: new Date().toISOString(),
      }
      if (isNew) {
        await supabase.from('tasks').insert([payload])
      } else {
        await supabase.from('tasks').update(payload).eq('id', task.id)
      }
      onSaved(); onClose()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function deleteTask() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onSaved(); onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:400, backdropFilter:'blur(2px)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:401, width:'90%', maxWidth:480, background:'var(--surface)', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', maxHeight:'90vh', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--navy)', display:'flex', alignItems:'center', gap:10, borderRadius:'16px 16px 0 0' }}>
          <div style={{ color:'#fff', fontWeight:600, flex:1 }}>{isNew ? '+ New Task' : 'Edit Task'}</div>
          <button onClick={onClose} style={{ background:'transparent', color:'rgba(255,255,255,0.7)', border:'none', fontSize:'1.4rem', cursor:'pointer' }}>×</button>
        </div>

        <div style={{ padding:20, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title||''} onChange={e=>set('title',e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Additional context…" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority||'normal'} onChange={e=>set('priority',e.target.value)}>
                {PRIORITIES.map(p=><option key={p} value={p}>{PRIORITY_STYLE[p].dot} {PRIORITY_STYLE[p].label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status||'todo'} onChange={e=>set('status',e.target.value)}>
                {COLUMNS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to</label>
              <select value={form.assigned_to||''} onChange={e=>set('assigned_to',e.target.value)}>
                <option value="">— unassigned —</option>
                {USERS.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From</label>
              <select value={form.created_by||''} onChange={e=>set('created_by',e.target.value)}>
                <option value="">— select —</option>
                {USERS.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Due date</label>
            <input type="date" value={form.due_date||''} onChange={e=>set('due_date',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Linked operation</label>
            <select value={form.operation_id||''} onChange={e=>set('operation_id',e.target.value||null)}>
              <option value="">— none —</option>
              {operations.map(o=><option key={o.id} value={o.id}>{o.ref} — {o.vessel_name} · {o.port}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
          <button onClick={save} disabled={saving||!form.title?.trim()} className="btn-primary" style={{ flex:1 }}>
            {saving ? 'Saving…' : isNew ? '+ Create' : '✓ Save'}
          </button>
          {!isNew && (
            <button onClick={deleteTask} style={{ background:'var(--red)', color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:'0.85rem' }}>
              Delete
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </>
  )
}

export default function Tasks() {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [editTask, setEditTask] = useState(null)
  const [showNew, setShowNew]   = useState(false)
  const [userFilter, setUserFilter] = useState('')
  const [operations, setOps]    = useState([])

  useEffect(() => {
    supabase.from('operations').select('id,ref,vessel_name,port').order('op_date', { ascending: false }).limit(200)
      .then(({ data }) => setOps(data || []))
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t))
  }

  async function passTask(id, toUser) {
    await supabase.from('tasks').update({ assigned_to: toUser, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, assigned_to: toUser } : t))
  }

  // Enrich with operation ref
  const enriched = tasks.map(t => ({
    ...t,
    operation_ref: operations.find(o => o.id === t.operation_id)?.ref || null,
    operation_vessel: operations.find(o => o.id === t.operation_id)?.vessel_name || null,
  }))

  const filtered = userFilter ? enriched.filter(t => t.assigned_to === userFilter) : enriched
  const byStatus = id => filtered.filter(t => t.status === id)

  const totalOpen = tasks.filter(t => t.status !== 'done').length
  const overdue   = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    return new Date(t.due_date) < new Date()
  }).length

  // Tasks assigned to each user
  const nicolaiCount = tasks.filter(t => t.assigned_to === 'Nicolai Baden' && t.status !== 'done').length
  const romeoCount   = tasks.filter(t => t.assigned_to === 'Romeo Baden' && t.status !== 'done').length

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginTop:2 }}>
            {totalOpen} open{overdue > 0 ? ` · ⚠️ ${overdue} overdue` : ''}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New task</button>
      </div>

      {/* User filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[
          { label: 'All tasks', value: '', count: tasks.filter(t => t.status !== 'done').length },
          { label: 'Nicolai', value: 'Nicolai Baden', count: nicolaiCount },
          { label: 'Romeo',   value: 'Romeo Baden',   count: romeoCount   },
        ].map(f => (
          <button key={f.value} onClick={() => setUserFilter(f.value)} style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 500,
            background: userFilter === f.value ? 'var(--navy)' : 'var(--bg)',
            color: userFilter === f.value ? '#fff' : 'var(--muted)',
            border: `1px solid ${userFilter === f.value ? 'var(--navy)' : 'var(--border)'}`,
          }}>
            {f.label}
            {f.count > 0 && (
              <span style={{ marginLeft:6, background: userFilter === f.value ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: userFilter === f.value ? '#fff' : 'var(--muted)', fontSize:'0.7rem', padding:'1px 6px', borderRadius:20 }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, alignItems:'start' }}>
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.id)
            return (
              <div key={col.id}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'0 4px' }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:col.color }} />
                  <span style={{ fontWeight:700, fontSize:'0.88rem' }}>{col.label}</span>
                  <span style={{ color:'var(--muted)', fontSize:'0.75rem', marginLeft:'auto', background:'var(--bg)', padding:'1px 8px', borderRadius:20, border:'1px solid var(--border)' }}>
                    {colTasks.length}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:80 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding:'24px 0', textAlign:'center', color:'var(--muted)', fontSize:'0.78rem', border:'2px dashed var(--border)', borderRadius:10 }}>
                      No tasks
                    </div>
                  ) : colTasks.map(t => (
                    <TaskCard key={t.id} task={t} onEdit={setEditTask} onStatusChange={updateStatus} onPass={passTask} />
                  ))}
                  {col.id === 'todo' && (
                    <button onClick={() => setShowNew(true)} style={{ background:'transparent', border:'1px dashed var(--border)', borderRadius:8, padding:'8px', color:'var(--muted)', cursor:'pointer', fontSize:'0.8rem', marginTop:4, transition:'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='var(--navy)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew  && <TaskModal task={null}     onClose={() => setShowNew(false)}  onSaved={load} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)}  onSaved={load} />}
    </div>
  )
}
