import { useState, useCallback, useEffect } from 'react'
import { Config } from '../types'
import { getConfigForUser, setConfigForUser } from '../utils/storage'

const DEFAULTS: Config = {
  taxa_gateway: 28,
  taxa_fixa_eur: 2,
  nome_relatorio: 'OP | PORTUGAL',
  cotacao_manual: null,
}

export function useConfig(userId: string) {
  const [config, setConfigState] = useState<Config>(DEFAULTS)

  useEffect(() => {
    setConfigState(getConfigForUser(userId))
  }, [userId])

  const updateConfig = useCallback((updates: Partial<Config>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates }
      setConfigForUser(userId, newConfig)
      return newConfig
    })
  }, [userId])

  const resetConfig = useCallback(() => {
    setConfigForUser(userId, DEFAULTS)
    setConfigState({ ...DEFAULTS })
  }, [userId])

  return { config, updateConfig, resetConfig }
}
