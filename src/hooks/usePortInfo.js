import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePortInfo(filters = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('port_info').select('*').order('port_name').order('commodity')
    if (filters.search) q = q.or(
      `port_name.ilike.%${filters.search}%,country.ilike.%${filters.search}%,commodity.ilike.%${filters.search}%`
    )
    if (filters.operation) q = q.eq('operation', filters.operation)
    const { data } = await q
    setData(data || [])
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refetch: fetch }
}

export async function savePortInfo(values, id = null) {
  if (id) {
    const { error } = await supabase.from('port_info').update(values).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('port_info').insert([values])
    if (error) throw error
  }
}

export async function deletePortInfo(id) {
  const { error } = await supabase.from('port_info').delete().eq('id', id)
  if (error) throw error
}

export function useOperationLogs(operationId) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!operationId) return
    const { data } = await supabase
      .from('operation_logs')
      .select('*')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }, [operationId])

  useEffect(() => { fetch() }, [fetch])

  const addLog = async (note) => {
    await supabase.from('operation_logs').insert([{ operation_id: operationId, note }])
    fetch()
  }

  return { logs, loading, addLog, refetch: fetch }
}
