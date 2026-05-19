import { Lancamento, Config } from '../types'

const KEYS = {
  lancamentos: 'gestao_saques:lancamentos',
  config: 'gestao_saques:config',
  ultima_cotacao: 'gestao_saques:ultima_cotacao',
  ultima_cotacao_ts: 'gestao_saques:ultima_cotacao_ts',
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

export function getUltimaCotacao(): { valor: number; timestamp: number } | null {
  try {
    const valor = localStorage.getItem(KEYS.ultima_cotacao)
    const ts = localStorage.getItem(KEYS.ultima_cotacao_ts)
    if (valor && ts) return { valor: parseFloat(valor), timestamp: parseInt(ts) }
  } catch { /* empty */ }
  return null
}

export function setUltimaCotacao(valor: number): void {
  localStorage.setItem(KEYS.ultima_cotacao, valor.toString())
  localStorage.setItem(KEYS.ultima_cotacao_ts, Date.now().toString())
}

export function clearAll(): void {
  Object.values(KEYS).forEach(k => {
    if (k !== KEYS.dark_mode) localStorage.removeItem(k)
  })
}
