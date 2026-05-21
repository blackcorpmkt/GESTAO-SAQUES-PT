import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Partner {
  id: string
  name: string
  percentage: number
  active: boolean
  createdAt: string
}

type Row = {
  id: string
  user_id: string
  name: string
  percentage: number
  active: boolean
  created_at: string
}

function mapRow(r: Row): Partner {
  return { id: r.id, name: r.name, percentage: Number(r.percentage), active: r.active, createdAt: r.created_at }
}

export function usePartners(userId: string, onError?: (msg: string) => void) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPartners = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) onError?.('Erro ao carregar sócios')
    else setPartners((data ?? []).map(r => mapRow(r as Row)))
    setLoading(false)
  }, [userId, onError])

  useEffect(() => { fetchPartners() }, [fetchPartners])

  const addPartner = useCallback(async (name: string, percentage: number): Promise<{ success: boolean }> => {
    const { error } = await supabase
      .from('partners')
      .insert({ user_id: userId, name, percentage, active: true })
    if (error) { onError?.('Erro ao adicionar sócio'); return { success: false } }
    await fetchPartners()
    return { success: true }
  }, [userId, onError, fetchPartners])

  const updatePartner = useCallback(async (
    id: string,
    updates: { name?: string; percentage?: number; active?: boolean },
  ): Promise<{ success: boolean }> => {
    const { error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) { onError?.('Erro ao atualizar sócio'); return { success: false } }
    await fetchPartners()
    return { success: true }
  }, [userId, onError, fetchPartners])

  return { partners, loading, addPartner, updatePartner, refreshPartners: fetchPartners }
}
