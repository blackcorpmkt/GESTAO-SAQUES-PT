import { Lancamento, Config } from '../types'

const KEYS = {
  lancamentos: 'gestao_saques:lancamentos',
  config: 'gestao_saques:config',
  dark_mode: 'gestao_saques:dark_mode',
} as const

const CONFIG_DEFAULTS: Config = {
  taxa_gateway: 28,
  taxa_fixa_eur: 2,
  nome_relatorio: 'OP | PORTUGAL',
  cotacao_manual: null,
}

export function getLancamentos(): Lancamento[] {
  try {
    const raw = localStorage.getItem(KEYS.lancamentos)
    const data: Lancamento[] = raw ? JSON.parse(raw) : []
    return data.map(l => ({ ...l, taxa_fixa_eur: l.taxa_fixa_eur ?? 0 }))
  } catch {
    return []
  }
}

export function setLancamentos(lancamentos: Lancamento[]): void {
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(lancamentos))
}

export function getConfig(): Config {
  try {
    const raw = localStorage.getItem(KEYS.config)
    if (raw) return { ...CONFIG_DEFAULTS, ...JSON.parse(raw) }
  } catch { /* empty */ }
  return { ...CONFIG_DEFAULTS }
}

export function setConfig(config: Config): void {
  localStorage.setItem(KEYS.config, JSON.stringify(config))
}

export function clearAll(): void {
  localStorage.removeItem(KEYS.lancamentos)
  localStorage.removeItem(KEYS.config)
}
