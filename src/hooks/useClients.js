import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setClients(data || [])
        setLoading(false)
      })
  }, [])

  return { clients, loading }
}

export function useClientTally() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('client_tally')
      .select('*')
      .then(({ data }) => {
        setData(data || [])
        setLoading(false)
      })
  }, [])

  return { data, loading }
}

export function useMonthlyStats() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('monthly_stats')
      .select('*')
      .then(({ data }) => {
        setData(data || [])
        setLoading(false)
      })
  }, [])

  return { data, loading }
}
