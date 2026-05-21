import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Inbox } from 'lucide-react'
import { Lancamento } from '../types'
import { Partner } from '../hooks/usePartners'
import { LaunchCost, NewLaunchCost, MoedaCusto } from '../hooks/useLaunchCosts'
import { formatarEUR, formatarMoedaBR, parseDateBR } from '../utils/formatacao'

interface Props {
  lancamentos: Lancamento[]
  partners: Partner[]
  costs: LaunchCost[]
  cotacao: number | null
  onAddCost: (cost: NewLaunchCost) => void
  onRemoveCost: (id: string) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const num = (s: string) => parseFloat(s.replace(',', '.')) || 0

const inputClass = 'sf-input'
const selectClass = 'sf-select'

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function custoParaEur(amount: number, moeda: MoedaCusto, cotacao: number | null, usdRate: number): number {
  if (moeda === 'EUR') return amount
  if (moeda === 'BRL') return cotacao && cotacao > 0 ? amount / cotacao : 0
  return amount * usdRate // USD
}

function Linha({ label, eur, brl, strong, destaque }: { label: string; eur: string; brl?: string; strong?: boolean; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 gap-3 ${destaque ? 'rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 -mx-1' : ''}`}>
      <span className={`text-sm ${strong || destaque ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <div className="text-right tabular-nums whitespace-nowrap">
        <span className={destaque ? 'text-base font-bold text-emerald-700 dark:text-emerald-400' : strong ? 'text-sm font-bold text-slate-900 dark:text-white' : 'text-sm font-medium text-slate-700 dark:text-slate-300'}>{eur}</span>
        {brl && <span className={`ml-2 ${destaque ? 'text-sm font-semibold text-emerald-600 dark:text-emerald-400' : 'text-xs text-slate-400 dark:text-slate-500'}`}>{brl}</span>}
      </div>
    </div>
  )
}

function LaunchRow({
  l, custos, partnersAtivos, cotacao, onAddCost, onRemoveCost, onToast,
}: {
  l: Lancamento
  custos: LaunchCost[]
  partnersAtivos: Partner[]
  cotacao: number | null
  onAddCost: (cost: NewLaunchCost) => void
  onRemoveCost: (id: string) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}) {
  const [aberto, setAberto] = useState(false)
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [moeda, setMoeda] = useState<MoedaCusto>('BRL')
  const [usd, setUsd] = useState('')

  const temCotacao = cotacao != null && cotacao > 0
  const brl = (v: number) => (temCotacao ? formatarMoedaBR(v * (cotacao as number)) : '—')

  const brutoEur = l.valor_bruto_eur
  const liquidoEur = l.valor_liquido_eur
  const gatewayEur = brutoEur - liquidoEur
  const outrosEur = custos.reduce((s, c) => s + c.amountEur, 0)
  const lucroEur = liquidoEur - outrosEur

  const handleAdd = () => {
    const d = desc.trim()
    const a = num(valor)
    const usdRate = num(usd)
    if (!d) { onToast('Informe a descrição do custo.', 'erro'); return }
    if (a <= 0) { onToast('Informe um valor maior que zero.', 'erro'); return }
    if (moeda === 'BRL' && !temCotacao) { onToast('Defina a cotação EUR/BRL nas Configurações.', 'erro'); return }
    if (moeda === 'USD' && usdRate <= 0) { onToast('Informe a cotação USD→EUR.', 'erro'); return }
    const amountEur = custoParaEur(a, moeda, cotacao, usdRate)
    const exchangeRate = moeda === 'EUR' ? 1 : moeda === 'BRL' ? (cotacao as number) : usdRate
    onAddCost({ launchId: l.id, description: d, amount: a, currency: moeda, exchangeRate, amountEur })
    setDesc(''); setValor(''); setUsd(''); setMoeda('BRL')
  }

  return (
    <div className="sf-card overflow-hidden">
      {/* Cabeçalho clicável */}
      <button
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <span className="text-slate-400 flex-shrink-0">
          {aberto ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </span>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{l.data_venda}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{l.num_vendas} vendas</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Bruto</p>
            <p className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{formatarEUR(brutoEur)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Líquido após gateway</p>
            <p className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">{formatarEUR(liquidoEur)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Em R$</p>
            <p className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">{brl(liquidoEur)}</p>
          </div>
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700 space-y-4">
          {/* Custos */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mt-3">Custos do lançamento</p>
            {custos.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {custos.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                    <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{c.description}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                      {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {c.currency}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums w-24 text-right">{formatarEUR(c.amountEur)}</span>
                    <button onClick={() => onRemoveCost(c.id)} title="Remover custo" className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form adicionar custo */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (ex: Anúncios)" className={`${inputClass} flex-1`} />
              <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={`${inputClass} sm:w-28 tabular-nums`} />
              <select value={moeda} onChange={e => setMoeda(e.target.value as MoedaCusto)} className={selectClass}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              {moeda === 'USD' && (
                <input type="text" inputMode="decimal" value={usd} onChange={e => setUsd(e.target.value)} placeholder="USD→EUR (0.92)" className={`${inputClass} sm:w-32 tabular-nums`} />
              )}
              <button onClick={handleAdd} className="sf-btn-primary">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-4">
            <Linha label="Faturamento bruto" eur={formatarEUR(brutoEur)} brl={brl(brutoEur)} />
            <Linha label="Custo gateway" eur={formatarEUR(gatewayEur)} />
            <Linha label="Outros custos" eur={formatarEUR(outrosEur)} brl={brl(outrosEur)} />
            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
              <Linha label="Lucro líquido" eur={formatarEUR(lucroEur)} brl={brl(lucroEur)} destaque />
            </div>
          </div>

          {/* Divisão por sócio */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Divisão por sócio</p>
            {partnersAtivos.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum sócio ativo. Cadastre em "Sócios".</p>
            ) : (
              <div className="space-y-1.5">
                {partnersAtivos.map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">{iniciais(p.name)}</span>
                    <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums w-12 text-right">{p.percentage}%</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums w-24 text-right">{formatarEUR(lucroEur * p.percentage / 100)}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums w-28 text-right">{brl(lucroEur * p.percentage / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function DivisaoLucro({ lancamentos, partners, costs, cotacao, onAddCost, onRemoveCost, onToast }: Props) {
  const partnersAtivos = partners.filter(p => p.active)
  const temCotacao = cotacao != null && cotacao > 0
  const brl = (v: number) => (temCotacao ? formatarMoedaBR(v * (cotacao as number)) : '—')

  const ordenados = lancamentos
    .slice()
    .sort((a, b) => parseDateBR(b.data_venda).getTime() - parseDateBR(a.data_venda).getTime())

  const custosPorLancamento = (id: string) => costs.filter(c => c.launchId === id)

  // Totais gerais
  const totalBrutoEur = lancamentos.reduce((s, l) => s + l.valor_bruto_eur, 0)
  const totalLiquidoEur = lancamentos.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalGatewayEur = totalBrutoEur - totalLiquidoEur
  const totalOutrosEur = costs.reduce((s, c) => s + c.amountEur, 0)
  const totalCustosEur = totalGatewayEur + totalOutrosEur
  const lucroTotalEur = totalLiquidoEur - totalOutrosEur

  return (
    <div className="space-y-5">
      {/* Resumo geral */}
      <div className="sf-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="sf-card-title">Resumo Geral</h2>
          <p className="sf-card-sub">Consolidado de todos os seus lançamentos</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-700">
          {[
            { label: 'Total bruto', eur: totalBrutoEur },
            { label: 'Total de custos', eur: totalCustosEur },
            { label: 'Lucro total', eur: lucroTotalEur, destaque: true },
          ].map(c => (
            <div key={c.label} className="bg-white dark:bg-slate-800 p-5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className={`font-display text-[22px] leading-tight font-semibold tabular-nums mt-1.5 tracking-[-0.02em] ${c.destaque ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{brl(c.eur)}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 tabular-nums">{formatarEUR(c.eur)}</p>
            </div>
          ))}
          <div className="bg-white dark:bg-slate-800 p-5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Divisão total por sócio</p>
            {partnersAtivos.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum sócio ativo</p>
            ) : (
              <div className="space-y-1">
                {partnersAtivos.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{p.name} <span className="text-slate-400">({p.percentage}%)</span></span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">{brl(lucroTotalEur * p.percentage / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de lançamentos */}
      {!temCotacao && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Defina a cotação EUR/BRL nas Configurações para ver os valores em R$ e converter custos em BRL.
        </div>
      )}

      {lancamentos.length === 0 ? (
        <div className="sf-card text-center py-16">
          <Inbox className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum lançamento para dividir ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenados.map(l => (
            <LaunchRow
              key={l.id}
              l={l}
              custos={custosPorLancamento(l.id)}
              partnersAtivos={partnersAtivos}
              cotacao={cotacao}
              onAddCost={onAddCost}
              onRemoveCost={onRemoveCost}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}
