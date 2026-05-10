import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLANK = { port: '', country: '', name: '', role: '', company: '', email: '', phone: '', notes: '' }

function ContactCard({ contact, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{contact.name}</span>
            {contact.role && <span style={{ background: 'var(--navy)', color: '#fff', fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{contact.role}</span>}
          </div>
          {contact.company && <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 4 }}>🏢 {contact.company}</div>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem' }}>
            {contact.email && <a href={'mailto:' + contact.email} style={{ color: 'var(--blue)', textDecoration: 'none' }}>✉️ {contact.email}</a>}
            {contact.phone && <a href={'tel:' + contact.phone} style={{ color: 'var(--blue)', textDecoration: 'none' }}>📞 {contact.phone}</a>}
          </div>
          {contact.notes && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>{contact.notes}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn-secondary btn-sm" onClick={() => onEdit(contact)}>Edit</button>
          <button onClick={() => onDelete(contact.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '6px 8px', fontSize: '0.85rem' }}>🗑</button>
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [portFilter, setPortFilter] = useState('')
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState(BLANK)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const allPorts = [...new Set(contacts.map(c => c.port).filter(Boolean))].sort()

  async function load() {
    setLoading(true)
    let q = supabase.from('contacts').select('*').order('port').order('name')
    if (portFilter) q = q.eq('port', portFilter)
    if (search)     q = q.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%,port.ilike.%${search}%`)
    const { data } = await q
    setContacts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search, portFilter])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openNew() { setForm(BLANK); setEditing(true); setError('') }
  function openEdit(c) { setForm({ ...c }); setEditing(true); setError('') }
  function closeEdit() { setEditing(false); setError('') }

  async function save() {
    if (!form.name) { setError('Name is required'); return }
    if (!form.port) { setError('Port is required'); return }
    setSaving(true); setError('')
    try {
      const { id, created_at, ...rest } = form
      if (id) {
        await supabase.from('contacts').update(rest).eq('id', id)
      } else {
        await supabase.from('contacts').insert([rest])
      }
      await load(); closeEdit()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    load()
  }

  // Group by port
  const grouped = contacts.reduce((acc, c) => {
    const port = c.port || 'Unknown Port'
    if (!acc[port]) acc[port] = []
    acc[port].push(c)
    return acc
  }, {})

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 2 }}>Port agents, surveyors, stevedores & key contacts per port</p>
        </div>
        <button className="btn-primary btn-sm" onClick={openNew}>+ New contact</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input placeholder="Search name, company, email…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <select value={portFilter} onChange={e => setPortFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All ports</option>
          {allPorts.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner" /> : contacts.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">👥</div>
          <p>No contacts yet.</p>
          <p style={{ fontSize: '0.8rem', marginTop: 6 }}>Click "New contact" to add port agents, surveyors, etc.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([port, portContacts]) => (
          <div key={port} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>📍 {port}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{portContacts.length} contact{portContacts.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {portContacts.map(c => <ContactCard key={c.id} contact={c} onEdit={openEdit} onDelete={del} />)}
            </div>
          </div>
        ))
      )}

      {/* Edit panel */}
      {editing && (
        <>
          <div onClick={closeEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'var(--surface)', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', animation: 'slideIn 0.22s ease' }}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>Contacts</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>{form.id ? 'Edit contact' : 'New contact'}</div>
              </div>
              <button onClick={closeEdit} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group form-full">
                  <label className="form-label">Full name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label">Port *</label>
                  <input value={form.port} onChange={e => set('port', e.target.value)} placeholder="Rotterdam" />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Netherlands" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Port Agent, Surveyor…" />
                </div>
                <div className="form-group form-full">
                  <label className="form-label">Company</label>
                  <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
                </div>
                <div className="form-group form-full">
                  <label className="form-label">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
                </div>
                <div className="form-group form-full">
                  <label className="form-label">Phone / WhatsApp</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+31 6 12345678" />
                </div>
                <div className="form-group form-full">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional notes…" />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface)' }}>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Saving…' : '✓ Save contact'}</button>
              <button onClick={closeEdit} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
