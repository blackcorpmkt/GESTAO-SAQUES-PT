import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export type MoedaCusto = 'BRL' | 'USD' | 'EUR'

export interface LaunchCost {
  id: string
  launchId: string
  description: string
  amount: number
  currency: MoedaCusto
  exchangeRate: number
  amountEur: number
}

export interface NewLaunchCost {
  launchId: string
  description: string
  amount: number
  currency: MoedaCusto
  exchangeRate: number
  amountEur: number
}

type Row = {
  id: string
  launch_id: string
  user_id: string
  description: string
  amount: number
  currency: string
  exchange_rate: number
  amount_eur: number
  created_at: string
}

function mapRow(r: Row): LaunchCost {
  return {
    id: r.id,
    launchId: r.launch_id,
    description: r.description,
    amount: Number(r.amount),
    currency: (r.currency as MoedaCusto) ?? 'BRL',
    exchangeRate: Number(r.exchange_rate),
    amountEur: Number(r.amount_eur),
  }
}

export function useLaunchCosts(userId: string, onError?: (msg: string) => void) {
  const [costs, setCosts] = useState<LaunchCost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('launch_costs')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) onError?.('Erro ao carregar custos')
        else setCosts((data ?? []).map(r => mapRow(r as Row)))
        setLoading(false)
      })
  }, [userId])

  const addCost = useCallback((cost: NewLaunchCost) => {
    const tempId = crypto.randomUUID()
    const optimistic: LaunchCost = { id: tempId, ...cost }
    setCosts(prev => [...prev, optimistic])
    supabase
      .from('launch_costs')
      .insert({
        launch_id: cost.launchId,
        user_id: userId,
        description: cost.description,
        amount: cost.amount,
        currency: cost.currency,
        exchange_rate: cost.exchangeRate,
        amount_eur: cost.amountEur,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setCosts(prev => prev.filter(c => c.id !== tempId))
          onError?.('Erro ao salvar custo')
        } else {
          // Substitui o id temporário pelo id real do banco
          setCosts(prev => prev.map(c => (c.id === tempId ? mapRow(data as Row) : c)))
        }
      })
  }, [userId, onError])

  const removeCost = useCallback((id: string) => {
    let backup: LaunchCost | undefined
    setCosts(prev => {
      backup = prev.find(c => c.id === id)
      return prev.filter(c => c.id !== id)
    })
    supabase
      .from('launch_costs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error && backup) {
          setCosts(prev => [...prev, backup!])
          onError?.('Erro ao remover custo')
        }
      })
  }, [userId, onError])

  return { costs, loading, addCost, removeCost }
}
