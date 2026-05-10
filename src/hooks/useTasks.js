import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_TASKS = {
  Underway: [
    { category: 'navigation', task: 'ETA confirmed to port agent', sort_order: 1 },
    { category: 'navigation', task: 'Pilot arranged', sort_order: 2 },
    { category: 'navigation', task: 'Tugs arranged', sort_order: 3 },
    { category: 'documents', task: 'Pre-arrival documents sent', sort_order: 4 },
    { category: 'documents', task: 'Port health docs prepared', sort_order: 5 },
    { category: 'daily', task: 'Daily report sent', sort_order: 6 },
  ],
  'In Port': [
    { category: 'navigation', task: 'ETB confirmed', sort_order: 1 },
    { category: 'navigation', task: 'Pilot arranged for berthing', sort_order: 2 },
    { category: 'navigation', task: 'Tugs arranged for berthing', sort_order: 3 },
    { category: 'cargo', task: 'Cargo figures confirmed', sort_order: 4 },
    { category: 'cargo', task: 'ETC confirmed', sort_order: 5 },
    { category: 'documents', task: 'Customs clearance done', sort_order: 6 },
    { category: 'documents', task: 'Documents submitted to port', sort_order: 7 },
    { category: 'crew', task: 'Crew change status confirmed', sort_order: 8 },
    { category: 'crew', task: 'Husbandry arranged', sort_order: 9 },
    { category: 'financial', task: 'Invoice issued to principal', sort_order: 10 },
    { category: 'daily', task: 'Daily report sent', sort_order: 11 },
    { category: 'daily', task: 'Follow-up with sub-agent', sort_order: 12 },
  ],
  Alongside: [
    { category: 'cargo', task: 'Cargo operations commenced', sort_order: 1 },
    { category: 'cargo', task: 'Cargo figures confirmed', sort_order: 2 },
    { category: 'cargo', task: 'ETC confirmed', sort_order: 3 },
    { category: 'cargo', task: 'Draught survey arranged', sort_order: 4 },
    { category: 'documents', task: 'Customs clearance done', sort_order: 5 },
    { category: 'documents', task: 'Bill of lading / cargo docs ready', sort_order: 6 },
    { category: 'crew', task: 'Crew change completed', sort_order: 7 },
    { category: 'crew', task: 'Husbandry completed', sort_order: 8 },
    { category: 'financial', task: 'Invoice issued to principal', sort_order: 9 },
    { category: 'financial', task: 'Invoice received from sub-agent', sort_order: 10 },
    { category: 'navigation', task: 'ETD confirmed', sort_order: 11 },
    { category: 'navigation', task: 'Outward pilot arranged', sort_order: 12 },
    { category: 'navigation', task: 'Outward tugs arranged', sort_order: 13 },
    { category: 'daily', task: 'Daily report sent', sort_order: 14 },
    { category: 'daily', task: 'Follow-up with principal', sort_order: 15 },
  ],
}

export const CATEGORY_LABELS = {
  navigation: { label: 'Navigation', color: '#185FA5', bg: '#D6EAF8' },
  cargo:      { label: 'Cargo',      color: '#854F0B', bg: '#FAEEDA' },
  documents:  { label: 'Documents',  color: '#5C3566', bg: '#E8DAEF' },
  crew:       { label: 'Crew',       color: '#1A5E38', bg: '#E2EFDA' },
  financial:  { label: 'Financial',  color: '#7F3F3F', bg: '#FADBD8' },
  daily:      { label: 'Daily',      color: '#1A4A6B', bg: '#D6EAF8' },
  custom:     { label: 'Custom',     color: '#888',    bg: '#F3F4F6' },
}

export function useTasks(operationId) {
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!operationId) return
    const { data } = await supabase
      .from('vessel_tasks')
      .select('*')
      .eq('operation_id', operationId)
      .order('sort_order')
      .order('created_at')

    // Auto-reset daily tasks that were completed before today
    const today = new Date().toISOString().split('T')[0]
    const toReset = (data || []).filter(t =>
      t.resets_daily && t.done && t.done_at && t.done_at.split('T')[0] < today
    )
    if (toReset.length > 0) {
      await supabase.from('vessel_tasks')
        .update({ done: false, done_at: null, task_time: null })
        .in('id', toReset.map(t => t.id))
      toReset.forEach(t => { t.done = false; t.done_at = null; t.task_time = null })
    }

    setTasks(data || [])
    setLoading(false)
  }, [operationId])

  useEffect(() => { fetch() }, [fetch])

  const initTasks = async (vesselStatus) => {
    const defaults = DEFAULT_TASKS[vesselStatus] || []
    if (!defaults.length) return
    const rows = defaults.map(d => ({ ...d, operation_id: operationId }))
    await supabase.from('vessel_tasks').insert(rows)
    fetch()
  }

  const toggleTask = async (id, done) => {
    const now = new Date().toISOString()
    await supabase.from('vessel_tasks').update({
      done,
      done_at: done ? now : null,
      task_time: done ? now : null,
    }).eq('id', id)
    setTasks(t => t.map(task => task.id === id ? { ...task, done, done_at: done ? now : null, task_time: done ? now : null } : task))
  }

  const updateTaskTime = async (id, task_time) => {
    await supabase.from('vessel_tasks').update({ task_time }).eq('id', id)
    setTasks(t => t.map(task => task.id === id ? { ...task, task_time } : task))
  }

  const updateResetsDaily = async (id, resets_daily) => {
    await supabase.from('vessel_tasks').update({ resets_daily }).eq('id', id)
    setTasks(t => t.map(task => task.id === id ? { ...task, resets_daily } : task))
  }

  const updateNotes = async (id, notes) => {
    await supabase.from('vessel_tasks').update({ notes }).eq('id', id)
    setTasks(t => t.map(task => task.id === id ? { ...task, notes } : task))
  }

  const addTask = async (taskName, category = 'custom') => {
    const { data } = await supabase.from('vessel_tasks')
      .insert([{ operation_id: operationId, task: taskName, category, sort_order: 999 }])
      .select().single()
    if (data) setTasks(t => [...t, data])
  }

  const deleteTask = async (id) => {
    await supabase.from('vessel_tasks').delete().eq('id', id)
    setTasks(t => t.filter(task => task.id !== id))
  }

  const clearAll = async () => {
    await supabase.from('vessel_tasks').delete().eq('operation_id', operationId)
    setTasks([])
  }

  const resetTasks = async () => {
    await supabase.from('vessel_tasks')
      .update({ done: false, done_at: null })
      .eq('operation_id', operationId)
    setTasks(t => t.map(task => ({ ...task, done: false, done_at: null })))
  }

  const completedCount = tasks.filter(t => t.done).length

  return { tasks, loading, initTasks, toggleTask, updateTaskTime, updateResetsDaily, updateNotes, addTask, deleteTask, clearAll, resetTasks, completedCount, total: tasks.length, refetch: fetch }
}
