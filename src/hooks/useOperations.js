import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useOperations(filters = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('operations')
        .select('*')
        .order('op_date', { ascending: false })
        .order('ref',     { ascending: false })
        .limit(10000)

      if (filters.op_type)       q = q.eq('op_type', filters.op_type)
      if (filters.year)          q = q.eq('year', filters.year)
      if (filters.entry_status)  q = q.eq('entry_status', filters.entry_status)
      if (filters.vessel_status) q = q.eq('vessel_status', filters.vessel_status)
      if (filters.client_name)   q = q.ilike('client_name', `%${filters.client_name}%`)
      if (filters.operator)      q = q.eq('operator', filters.operator)
      if (filters.search)        q = q.or(
        `vessel_name.ilike.%${filters.search}%,port.ilike.%${filters.search}%,` +
        `client_name.ilike.%${filters.search}%,ref.ilike.%${filters.search}%`
      )
      if (filters.limit)         q = q.limit(filters.limit)

      const { data, error } = await q
      if (error) throw error
      setData(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useActiveVessels() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('active_vessels')
      .select('*')
    setData(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const sub = supabase
      .channel('ops_changes_' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operations' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetch])

  return { data, loading, refetch: fetch }
}

export async function createOperation(values) {
  const { data, error } = await supabase
    .from('operations')
    .insert([values])
    .select()
    .single()
  if (error) throw error
  // Auto-add to VesselAPI monitoring if MMSI is known
  if (data?.mmsi) {
    fetch('/api/vessel-watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mmsi: data.mmsi, action: 'add' }),
    }).catch(() => {}) // fire and forget
  }
  return data
}

export async function updateOperation(id, values) {
  const { error } = await supabase
    .from('operations')
    .update(values)
    .eq('id', id)
  if (error) throw error
}

export async function deleteOperation(id) {
  const { error } = await supabase
    .from('operations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getNextSeqNum(opType, year) {
  const { data, error } = await supabase.rpc('next_seq_num', {
    p_op_type: opType,
    p_year: year,
  })
  if (error) throw error
  return data
}
