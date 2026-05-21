import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hourglass, CheckCircle2, CalendarDays, TrendingUp, ShieldCheck, ArrowRight, type LucideIcon } from 'lucide-react'
import { Lancamento, Config } from '../types'
import { formatarMoedaBR, formatarEUR, parseDateBR, formatDateBR } from '../utils/formatacao'
import { useAuth } from '../contexts/AuthContext'

type Tone = 'blue' | 'green' | 'amber' | 'violet'

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
  tone,
}: {
  titulo: string
  valorBRL: string
  valorEUR: string
  badge?: React.ReactNode
  Icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="sf-kpi">
      <div className="flex items-center justify-between mb-3.5">
        <span className="sf-kpi-label">{titulo}</span>
        <span className={`sf-kpi-icon sf-kpi-icon-${tone}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="sf-kpi-value">{valorBRL}</p>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">{valorEUR}</p>
      {badge && <div className="mt-3">{badge}</div>}
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'info' | 'success' | 'violet' | 'warning' | 'neutral' }) {
  return <span className={`sf-badge sf-badge-${tone}`}>{children}</span>
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
        <div className="max-w-md w-full text-center sf-card p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2 tracking-[-0.01em]">
            Acesso de administrador
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Você está logado como administrador. Acesse o Painel Admin para visualizar os dados de todos os usuários.
          </p>
          <Link to="/admin" className="sf-btn-primary px-5 py-2.5">
            <ShieldCheck className="w-[18px] h-[18px]" /> Ir para o Painel Admin
            <ArrowRight className="w-4 h-4" />
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
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Faturamento Bruto"
          valorBRL={faturamentoBrutoBrl != null ? formatarMoedaBR(faturamentoBrutoBrl) : '—'}
          valorEUR={formatarEUR(faturamentoBrutoEur)}
          Icon={TrendingUp}
          tone="violet"
        />

        <MetricCard
          titulo="A receber (pendentes)"
          valorBRL={formatarMoedaBR(totalPendenteBrl)}
          valorEUR={formatarEUR(totalPendenteEur)}
          Icon={Hourglass}
          tone="amber"
          badge={
            pendentes.length > 0 || showPct ? (
              <div className="flex flex-wrap gap-1.5">
                {pendentes.length > 0 && (
                  <Badge tone="warning">
                    {pendentes.length} lançamento{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {showPct && (
                  <Badge tone="info">
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
          tone="green"
          badge={
            recebidos.length > 0 || showPct ? (
              <div className="flex flex-wrap gap-1.5">
                {recebidos.length > 0 && (
                  <Badge tone="success">
                    {recebidos.length} recebido{recebidos.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {showPct && (
                  <Badge tone="success">
                    Sua parte ({pct}%): {formatarEUR(totalRecebidoEur * pct / 100)}
                  </Badge>
                )}
              </div>
            ) : undefined
          }
        />

        {proximoRecebimento ? (
          <div className="sf-kpi">
            <div className="flex items-center justify-between mb-3.5">
              <span className="sf-kpi-label">Próximo recebimento</span>
              <span className="sf-kpi-icon sf-kpi-icon-blue">
                <CalendarDays className="w-4 h-4" />
              </span>
            </div>
            <p className="sf-kpi-value">{formatarMoedaBR(proximoRecebimento.valor_brl)}</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">
              {formatarEUR(proximoRecebimento.valor_liquido_eur)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="info">{proximoRecebimento.data_recebimento}</Badge>
              {proxEhHoje && <Badge tone="warning">Hoje!</Badge>}
              {proxEhAmanha && <Badge tone="violet">Amanhã</Badge>}
            </div>
          </div>
        ) : (
          <MetricCard titulo="Próximo recebimento" valorBRL="—" valorEUR="Sem pendentes" Icon={CalendarDays} tone="blue" />
        )}
      </div>

      {/* Card de cotação manual */}
      <div className="sf-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <p className="sf-kpi-label uppercase tracking-wider mb-2">Cotação EUR/BRL</p>
            {cotacaoAtual != null ? (
              <>
                <p className="font-display text-3xl font-semibold text-slate-900 dark:text-white tabular-nums tracking-[-0.02em]">
                  R$ {cotacaoDisplay}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  Cotação manual ativa — usada em todos os cálculos
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl font-semibold text-slate-300 dark:text-slate-600">—</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                  Nenhuma cotação definida. Defina ao lado para calcular valores em R$.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:min-w-[280px]">
            <label className="sf-label mb-0">Definir cotação manualmente</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={cotacaoInput}
                onChange={e => { setCotacaoInput(e.target.value); setErro('') }}
                onKeyDown={e => e.key === 'Enter' && handleSalvar()}
                placeholder="Ex: 5.83"
                className="sf-input flex-1 tabular-nums"
              />
              <button
                onClick={handleSalvar}
                className={salvando ? 'sf-btn-success' : 'sf-btn-primary'}
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
