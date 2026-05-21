import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hourglass, CheckCircle2, CalendarDays, TrendingUp, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Lancamento, Config } from '../types'
import { formatarMoedaBR, formatarEUR, parseDateBR, formatDateBR } from '../utils/formatacao'
import { useAuth } from '../contexts/AuthContext'

const CARD_COR: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
}

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
  Icon,
  cor,
}: {
  titulo: string
  valorBRL: string
  valorEUR: string
  badge?: React.ReactNode
  Icon: LucideIcon
  cor: keyof typeof CARD_COR
}) {
  return (
    <div className="rounded-xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{titulo}</p>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${CARD_COR[cor]}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="text-[28px] leading-tight font-bold text-gray-900 dark:text-white mb-1 tabular-nums">{valorBRL}</p>
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

  // Mantém o input em sincronia com o config (que carrega de forma assíncrona do Supabase).
  // Sem isso, o input fica preso ao valor inicial e pode sobrescrever a cotação ao salvar.
  useEffect(() => {
    setCotacaoInput(config.cotacao_manual != null ? String(config.cotacao_manual) : '')
  }, [config.cotacao_manual])

  // Admin não opera lançamentos: em vez das métricas/cotação, mostra atalho ao Painel Admin.
  if (currentUser?.role === 'admin') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Acesso de administrador</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Você está logado como administrador. Acesse o Painel Admin para visualizar os dados de todos os usuários.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm hover:shadow-md"
          >
            <ShieldCheck className="w-5 h-5" /> Ir para o Painel Admin
          </Link>
        </div>
      </div>
    )
  }

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

  // Faturamento bruto: soma do valor bruto de TODOS os lançamentos (qualquer status)
  const faturamentoBrutoEur = lancamentos.reduce((s, l) => s + l.valor_bruto_eur, 0)
  const faturamentoBrutoBrl = cotacaoAtual != null ? faturamentoBrutoEur * cotacaoAtual : null

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-md">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Faturamento Bruto</p>
            <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <p className="text-[28px] leading-tight font-bold text-gray-900 dark:text-white mb-1 tabular-nums">{formatarEUR(faturamentoBrutoEur)}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tabular-nums">
            {faturamentoBrutoBrl != null ? formatarMoedaBR(faturamentoBrutoBrl) : '—'}
          </p>
        </div>

        <MetricCard
          titulo="A receber (pendentes)"
          valorBRL={formatarMoedaBR(totalPendenteBrl)}
          valorEUR={formatarEUR(totalPendenteEur)}
          Icon={Hourglass}
          cor="blue"
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
          Icon={CheckCircle2}
          cor="emerald"
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
          <div className="rounded-xl p-5 shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Próximo recebimento</p>
              <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                <CalendarDays className="w-5 h-5" />
              </span>
            </div>
            <p className="text-[28px] leading-tight font-bold text-gray-900 dark:text-white mb-1 tabular-nums">
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
          <MetricCard titulo="Próximo recebimento" valorBRL="—" valorEUR="Sem pendentes" Icon={CalendarDays} cor="violet" />
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
