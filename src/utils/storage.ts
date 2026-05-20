import { Lancamento, Config } from '../types'

const CONFIG_DEFAULTS: Config = {
  taxa_gateway: 28,
  taxa_fixa_eur: 2,
  nome_relatorio: 'OP | PORTUGAL',
  cotacao_manual: null,
}

// Chaves isoladas por usuário
const launchesKey = (userId: string) => `gs_launches_${userId}`
const settingsKey = (userId: string) => `gs_settings_${userId}`

export function getLancamentosForUser(userId: string): Lancamento[] {
  try {
    const raw = localStorage.getItem(launchesKey(userId))
    const data: Lancamento[] = raw ? JSON.parse(raw) : []
    return data.map(l => ({ ...l, taxa_fixa_eur: l.taxa_fixa_eur ?? 0 }))
  } catch {
    return []
  }
}

export function setLancamentosForUser(userId: string, lancamentos: Lancamento[]): void {
  localStorage.setItem(launchesKey(userId), JSON.stringify(lancamentos))
}

export function getConfigForUser(userId: string): Config {
  try {
    const raw = localStorage.getItem(settingsKey(userId))
    if (raw) return { ...CONFIG_DEFAULTS, ...JSON.parse(raw) }
  } catch { /* empty */ }
  return { ...CONFIG_DEFAULTS }
}

export function setConfigForUser(userId: string, config: Config): void {
  localStorage.setItem(settingsKey(userId), JSON.stringify(config))
}

export function clearUserData(userId: string): void {
  localStorage.removeItem(launchesKey(userId))
  localStorage.removeItem(settingsKey(userId))
}
