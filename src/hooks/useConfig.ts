import { useState, useCallback } from 'react'
import { Config } from '../types'
import { getConfig, setConfig as saveConfig } from '../utils/storage'

const DEFAULTS: Config = {
  taxa_gateway: 28,
  taxa_fixa_eur: 2,
  nome_relatorio: 'OP | PORTUGAL',
  cotacao_manual: null,
}

export function useConfig() {
  const [config, setConfigState] = useState<Config>(getConfig)

  const updateConfig = useCallback((updates: Partial<Config>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates }
      saveConfig(newConfig)
      return newConfig
    })
  }, [])

  const resetConfig = useCallback(() => {
    saveConfig(DEFAULTS)
    setConfigState({ ...DEFAULTS })
  }, [])

  return { config, updateConfig, resetConfig }
}
