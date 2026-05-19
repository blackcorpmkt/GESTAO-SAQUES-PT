import { useState } from 'react'
import { Lancamento } from '../types'
import { CotacaoState } from '../hooks/useCotacao'
import { formatarMoedaBR, formatarEUR, formatarHora, parseDateBR, formatDateBR } from '../utils/formatacao'
import { Config } from '../types'

interface Props {
  lancamentos: Lancamento[]
  cotacao: CotacaoState
  config: Config
  onAtualizarCotacao: () => void
  onUpdateConfig: (updates: Partial<Config>) => void
}

function MetricCard({
  titulo,
  valorBRL,
  valorEUR,
  badge,
  icon,
  cor,
}: {
  titulo: string
  valorBRL: string
  valorEUR: string
  badge?: React.ReactNode
  icon: string
  cor: string
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-5 shadow-sm border
      bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700
      transition-all duration-200 hover:shadow-md
    `}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 ${cor}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{titulo}</p>
        <span className={`text-xl ${cor.replace('bg-', 'text-')}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tabular-nums">{valorBRL}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tabular-nums">{valorEUR}</p>
      {badge && <div className="mt-2">{badge}</div>}
    </div>
  )
}

function Badge({ children, cor }: { children: React.ReactNode; cor: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cor}`}>
      {children}
    </span>
  )
}

export function Dashboard({ lancamentos, cotacao, config, onAtualizarCotacao, onUpdateConfig }: Props) {
  const [cotacaoInput, setCotacaoInput] = useState(config.cotacao_manual?.toFixed(4) ?? '')
  const [salvando, setSalvando] = useState(false)

  const hoje = formatDateBR(new Date())
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()

  const pendentes = lancamentos.filter(l => l.status === 'pendente')
  const recebidos = lancamentos.filter(l => l.status === 'recebido')

  const totalPendenteEur = pendentes.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalPendenteBrl = pendentes.reduce((s, l) => s + l.valor_brl, 0)
  const totalRecebidoEur = recebidos.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalRecebidoBrl = recebidos.reduce((s, l) => s + l.valor_brl, 0)

  const proximoRecebimento = pendentes
    .sort((a, b) => parseDateBR(a.data_recebimento).getTime() - parseDateBR(b.data_recebimento).getTime())
    .find(() => true) ?? null

  const proxEhHoje = proximoRecebimento?.data_recebimento === hoje
  const proxEhAmanha = proximoRecebimento?.data_recebimento === amanha

  const handleSalvarCotacaoManual = () => {
    const val = parseFloat(cotacaoInput.replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    setSalvando(true)
    onUpdateConfig({ cotacao_manual: val })
    setTimeout(() => setSalvando(false), 800)
  }

  const cotacaoDisplay = cotacao.valor ? cotacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          titulo="A receber (pendentes)"
          valorBRL={formatarMoedaBR(totalPendenteBrl)}
          valorEUR={formatarEUR(totalPendenteEur)}
          icon="⏳"
          cor="bg-blue-500"
          badge={
            pendentes.length > 0
              ? <Badge cor="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {pendentes.length} lançamento{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
                </Badge>
              : undefined
          }
        />
        <MetricCard
          titulo="Total recebido"
          valorBRL={formatarMoedaBR(totalRecebidoBrl)}
          valorEUR={formatarEUR(totalRecebidoEur)}
          icon="✅"
          cor="bg-emerald-500"
          badge={
            recebidos.length > 0
              ? <Badge cor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {recebidos.length} recebido{recebidos.length !== 1 ? 's' : ''}
                </Badge>
              : undefined
          }
        />
        {proximoRecebimento ? (
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 bg-violet-500" />
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Próximo recebimento</p>
              <span className="text-xl text-violet-500">📅</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tabular-nums">
              {formatarMoedaBR(proximoRecebimento.valor_brl)}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tabular-nums">
              {formatarEUR(proximoRecebimento.valor_liquido_eur)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge cor="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                {proximoRecebimento.data_recebimento}
              </Badge>
              {proxEhHoje && <Badge cor="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Hoje!</Badge>}
              {proxEhAmanha && <Badge cor="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Amanhã</Badge>}
            </div>
          </div>
        ) : (
          <MetricCard titulo="Próximo recebimento" valorBRL="—" valorEUR="Sem pendentes" icon="📅" cor="bg-violet-500" />
        )}
      </div>

      <div className="rounded-2xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cotação EUR/BRL</p>
            <div className="flex items-baseline gap-2">
              {cotacao.loading ? (
                <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                    R$ {cotacaoDisplay}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    cotacao.fonte === 'api'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : cotacao.fonte === 'cache'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {cotacao.fonte === 'api' ? 'Ao vivo' : cotacao.fonte === 'cache' ? 'Cache' : 'Manual'}
                  </span>
                </>
              )}
            </div>
            {cotacao.timestamp && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Atualizado às {formatarHora(cotacao.timestamp)}
              </p>
            )}
            {cotacao.erro && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{cotacao.erro}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              onClick={onAtualizarCotacao}
              disabled={cotacao.loading}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50 transition-colors"
            >
              <span className={cotacao.loading ? 'animate-spin' : ''}>↻</span>
              Buscar cotação da API
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={cotacaoInput}
                onChange={e => setCotacaoInput(e.target.value)}
                placeholder="Ex: 6,21"
                className="w-28 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSalvarCotacaoManual}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  salvando
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {salvando ? '✓ Salvo' : 'Definir manual'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
