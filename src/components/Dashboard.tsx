import { useState } from 'react'
import { Lancamento, Config } from '../types'
import { formatarMoedaBR, formatarEUR, parseDateBR, formatDateBR } from '../utils/formatacao'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  lancamentos: Lancamento[]
  config: Config
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
    <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-md">
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

export function Dashboard({ lancamentos, config, onUpdateConfig }: Props) {
  const { currentUser } = useAuth()
  const [cotacaoInput, setCotacaoInput] = useState(
    config.cotacao_manual != null ? String(config.cotacao_manual) : ''
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const hoje = formatDateBR(new Date())
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()

  const pendentes = lancamentos.filter(l => l.status === 'pendente')
  const recebidos = lancamentos.filter(l => l.status === 'recebido')

  const totalPendenteEur = pendentes.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalPendenteBrl = pendentes.reduce((s, l) => s + l.valor_brl, 0)
  const totalRecebidoEur = recebidos.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalRecebidoBrl = recebidos.reduce((s, l) => s + l.valor_brl, 0)

  const proximoRecebimento = pendentes
    .slice()
    .sort((a, b) => parseDateBR(a.data_recebimento).getTime() - parseDateBR(b.data_recebimento).getTime())[0] ?? null

  const proxEhHoje = proximoRecebimento?.data_recebimento === hoje
  const proxEhAmanha = proximoRecebimento?.data_recebimento === amanha

  const cotacaoAtual = config.cotacao_manual

  // Percentual de sociedade (apenas para usuários comuns com % definido)
  const pct = currentUser?.role === 'user' ? (currentUser?.percentage ?? 0) : 0
  const showPct = pct > 0

  const handleSalvar = () => {
    const raw = cotacaoInput.replace(',', '.')
    const val = parseFloat(raw)
    if (isNaN(val) || val <= 0) {
      setErro('Digite um valor válido, ex: 5.83')
      return
    }
    setErro('')
    setSalvando(true)
    onUpdateConfig({ cotacao_manual: val })
    setTimeout(() => setSalvando(false), 800)
  }

  const cotacaoDisplay = cotacaoAtual != null
    ? cotacaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  return (
    <div className="space-y-4">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          titulo="A receber (pendentes)"
          valorBRL={formatarMoedaBR(totalPendenteBrl)}
          valorEUR={formatarEUR(totalPendenteEur)}
          icon="⏳"
          cor="bg-blue-500"
          badge={
            pendentes.length > 0 || showPct ? (
              <div className="flex flex-wrap gap-1.5">
                {pendentes.length > 0 && (
                  <Badge cor="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {pendentes.length} lançamento{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {showPct && (
                  <Badge cor="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    Sua parte ({pct}%): {formatarEUR(totalPendenteEur * pct / 100)}
                  </Badge>
                )}
              </div>
            ) : undefined
          }
        />

        <MetricCard
          titulo="Total recebido"
          valorBRL={formatarMoedaBR(totalRecebidoBrl)}
          valorEUR={formatarEUR(totalRecebidoEur)}
          icon="✅"
          cor="bg-emerald-500"
          badge={
            recebidos.length > 0 || showPct ? (
              <div className="flex flex-wrap gap-1.5">
                {recebidos.length > 0 && (
                  <Badge cor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {recebidos.length} recebido{recebidos.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {showPct && (
                  <Badge cor="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                    Sua parte ({pct}%): {formatarEUR(totalRecebidoEur * pct / 100)}
                  </Badge>
                )}
              </div>
            ) : undefined
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
              {proxEhHoje && (
                <Badge cor="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Hoje!</Badge>
              )}
              {proxEhAmanha && (
                <Badge cor="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Amanhã</Badge>
              )}
            </div>
          </div>
        ) : (
          <MetricCard titulo="Próximo recebimento" valorBRL="—" valorEUR="Sem pendentes" icon="📅" cor="bg-violet-500" />
        )}
      </div>

      {/* Card de cotação manual */}
      <div className="rounded-2xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Cotação EUR/BRL
            </p>
            {cotacaoAtual != null ? (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                  R$ {cotacaoDisplay}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Cotação manual ativa — usada em todos os cálculos
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-400 dark:text-gray-600">—</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Nenhuma cotação definida. Defina abaixo para calcular valores em R$.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:min-w-[260px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Definir cotação manualmente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={cotacaoInput}
                onChange={e => { setCotacaoInput(e.target.value); setErro('') }}
                onKeyDown={e => e.key === 'Enter' && handleSalvar()}
                placeholder="Ex: 5.83"
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              />
              <button
                onClick={handleSalvar}
                className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  salvando
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                }`}
              >
                {salvando ? '✓ Salvo' : 'Definir'}
              </button>
            </div>
            {erro && <p className="text-xs text-red-500">{erro}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
