import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useOperations } from '../hooks/useOperations'

const USERS = ['Nicolai Baden', 'Romeo Baden']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const PRIORITY_STYLE = {
  low:    { color: 'var(--muted)',  bg: 'var(--bg)',        label: 'Low'    },
  normal: { color: 'var(--blue)',   bg: 'var(--blue-bg)',   label: 'Normal' },
  high:   { color: 'var(--amber)',  bg: 'var(--amber-bg)',  label: 'High'   },
  urgent: { color: 'var(--red)',    bg: 'var(--red-bg)',    label: 'Urgent' },
}

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: 'var(--muted)' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--amber)' },
  { id: 'done',        label: 'Done',        color: 'var(--green)' },
]

function TaskCard({ task, onEdit, onStatusChange }) {
  const ps = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.normal
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      onClick={() => onEdit(task)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
        borderLeft: `3px solid ${ps.color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{task.title}</div>
          {task.description && (
            <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 3, lineHeight: 1.4 }}>
              {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
            </div>
          )}
        </div>
        <span style={{ background: ps.bg, color: ps.color, fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {ps.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {task.assigned_to && (
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 20 }}>
            👤 {task.assigned_to.split(' ')[0]}
          </span>
        )}
        {task.operation_ref && (
          <span style={{ fontSize: '0.72rem', color: 'var(--blue)', fontFamily: 'var(--mono)', background: 'var(--blue-bg)', padding: '2px 8px', borderRadius: 20 }}>
            {task.operation_ref}
          </span>
        )}
        {task.due_date && (
          <span style={{ fontSize: '0.72rem', color: isOverdue ? 'var(--red)' : 'var(--muted)', fontWeight: isOverdue ? 700 : 400 }}>
            📅 {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            {isOverdue ? ' ⚠️' : ''}
          </span>
        )}
      </div>

      {/* Quick status buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
        {COLUMNS.filter(c => c.id !== task.status).map(c => (
          <button key={c.id} onClick={() => onStatusChange(task.id, c.id)}
            style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--muted)', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.color = c.color }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TaskModal({ task, onClose, onSaved, operations }) {
  const isNew = !task?.id
  const [form, setForm] = useState(task || {
    title: '', description: '', status: 'todo', priority: 'normal',
    assigned_to: '', created_by: '', operation_id: null, due_date: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title?.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:        form.title.trim(),
        description:  form.description || null,
        status:       form.status || 'todo',
        priority:     form.priority || 'normal',
        assigned_to:  form.assigned_to || null,
        created_by:   form.created_by || null,
        operation_id: form.operation_id || null,
        due_date:     form.due_date || null,
        updated_at:   new Date().toISOString(),
      }
      if (isNew) {
        const { error } = await supabase.from('tasks').insert([payload])
        if (error) throw error
      } else {
        const { error } = await supabase.from('tasks').update(payload).eq('id', task.id)
        if (error) throw error
      }
      onSaved()
      onClose()
    } catch(e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onSaved()
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 401, width: '90%', maxWidth: 500, background: 'var(--surface)',
        borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>
          <div style={{ color: '#fff', fontWeight: 600, flex: 1 }}>{isNew ? '+ New Task' : 'Edit Task'}</div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Task description…" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="Additional notes…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority || 'normal'} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status || 'todo'} onChange={e => set('status', e.target.value)}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to</label>
              <select value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">— unassigned —</option>
                {USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Created by</label>
              <select value={form.created_by || ''} onChange={e => set('created_by', e.target.value)}>
                <option value="">— select —</option>
                {USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Due date</label>
            <input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Linked operation (optional)</label>
            <select value={form.operation_id || ''} onChange={e => set('operation_id', e.target.value || null)}>
              <option value="">— none —</option>
              {operations.map(o => <option key={o.id} value={o.id}>{o.ref} — {o.vessel_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving || !form.title?.trim()} className="btn-primary" style={{ flex: 1 }}>
            {saving ? 'Saving…' : isNew ? '+ Create task' : '✓ Save changes'}
          </button>
          {!isNew && (
            <button onClick={deleteTask} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>
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
  const [filter, setFilter]     = useState('')
  const [userFilter, setUserFilter] = useState('')
  const { data: operations }    = useOperations({ limit: 500 })

  // Enrich tasks with operation ref
  const enriched = tasks.map(t => ({
    ...t,
    operation_ref: operations.find(o => o.id === t.operation_id)?.ref || null,
  }))

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t))
  }

  const filtered = enriched.filter(t => {
    if (userFilter && t.assigned_to !== userFilter) return false
    if (filter && !t.title.toLowerCase().includes(filter.toLowerCase()) && !(t.assigned_to||'').toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const byStatus = (status) => filtered.filter(t => t.status === status)
  const totalOpen = tasks.filter(t => t.status !== 'done').length
  const overdue   = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>
            {totalOpen} open{overdue > 0 ? ` · ⚠️ ${overdue} overdue` : ''}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New task</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search tasks…" style={{ flex: 1, minWidth: 160 }} />
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All users</option>
          {USERS.map(u => <option key={u} value={u}>{u.split(' ')[0]}</option>)}
        </select>
        <button onClick={() => { setFilter(''); setUserFilter('') }} className="btn-secondary btn-sm">Clear</button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.id)
            return (
              <div key={col.id}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{col.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: 'auto', background: 'var(--bg)', padding: '1px 8px', borderRadius: 20 }}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', border: '2px dashed var(--border)', borderRadius: 10 }}>
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(t => (
                      <TaskCard key={t.id} task={t} onEdit={setEditTask} onStatusChange={updateStatus} />
                    ))
                  )}

                  {/* Add task button per column */}
                  {col.id === 'todo' && (
                    <button onClick={() => setShowNew(true)} style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', marginTop: 4 }}>
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <TaskModal task={null} onClose={() => setShowNew(false)} onSaved={load} operations={operations} />
      )}
      {editTask && (
        <TaskModal task={editTask} onClose={() => setEditTask(null)} onSaved={load} operations={operations} />
      )}
    </div>
  )
}
