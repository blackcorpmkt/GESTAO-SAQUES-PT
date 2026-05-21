import { useState, useCallback, useEffect } from 'react'
import { Config } from '../types'
import { supabase } from '../lib/supabaseClient'

const DEFAULTS: Config = {
  taxa_gateway: 28,
  taxa_fixa_eur: 2,
  nome_relatorio: 'OP | PORTUGAL',
  cotacao_manual: null,
}

export function useConfig(userId: string, onError?: (msg: string) => void) {
  const [config, setConfigState] = useState<Config>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          onError?.('Erro ao carregar configurações')
        } else if (data) {
          setConfigState({
            taxa_gateway: data.gateway_percentage,
            taxa_fixa_eur: data.gateway_fixed_fee,
            nome_relatorio: data.report_name,
            cotacao_manual: data.exchange_rate ?? null,
          })
        }
        setLoading(false)
      })
  }, [userId])

  const updateConfig = useCallback((updates: Partial<Config>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates }
      supabase
        .from('settings')
        .upsert({
          user_id: userId,
          gateway_percentage: newConfig.taxa_gateway,
          gateway_fixed_fee: newConfig.taxa_fixa_eur,
          report_name: newConfig.nome_relatorio,
          exchange_rate: newConfig.cotacao_manual,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) onError?.('Erro ao salvar configurações')
        })
      return newConfig
    })
  }, [userId, onError])

  const resetConfig = useCallback(() => {
    setConfigState({ ...DEFAULTS })
    supabase
      .from('settings')
      .delete()
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) onError?.('Erro ao resetar configurações')
      })
  }, [userId, onError])

  return { config, loading, updateConfig, resetConfig }
}
