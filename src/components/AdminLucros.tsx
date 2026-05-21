import { useCallback, useMemo, useState } from 'react'
import { TrendingUp, Euro, Users as UsersIcon, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAdminProfit } from '../hooks/useAdminProfit'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'

interface Props {
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

interface DetailRow {
  accountName: string
  accountUsername: string
  percentage: number
  profitEur: number
  profitBrl: number
}

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export function AdminLucros({ onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { rows, totals, loading } = useAdminProfit(handleError)

  // Busca por sócio
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Sugestões: a lista consolidada já contém todos os nomes com lucro (e respeita a
  // RLS via RPC), então filtramos no cliente — sem bater no banco a cada tecla.
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || selected) return []
    return rows.filter(r => r.partnerName.toLowerCase().includes(q)).slice(0, 8)
  }, [query, rows, selected])

  const selectPartner = useCallback(async (name: string) => {
    setSelected(name)
    setQuery(name)
    setDetailLoading(true)
    const { data, error } = await supabase.rpc('get_partner_profit_detail', { partner_name: name })
    if (error) {
      onToast('Erro ao carregar detalhe do sócio', 'erro')
      setDetail([])
    } else {
      setDetail(((data ?? []) as Record<string, unknown>[]).map(r => ({
        accountName: r.account_name as string,
        accountUsername: r.account_username as string,
        percentage: Number(r.percentage) || 0,
        profitEur: Number(r.profit_eur) || 0,
        profitBrl: Number(r.profit_brl) || 0,
      })))
    }
    setDetailLoading(false)
  }, [onToast])

  const clearSearch = () => { setSelected(null); setQuery(''); setDetail([]) }

  const detailTotals = detail.reduce(
    (acc, r) => ({ eur: acc.eur + r.profitEur, brl: acc.brl + r.profitBrl }),
    { eur: 0, brl: 0 },
  )

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <div className="sf-card p-4">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-3.5 py-2.5">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); if (selected) setSelected(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && suggestions[0]) selectPartner(suggestions[0].partnerName) }}
              placeholder="Buscar sócio pelo nome..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {(query || selected) && (
              <button onClick={clearSearch} title="Limpar busca" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-pop overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.partnerName}
                  onClick={() => selectPartner(s.partnerName)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 grid place-items-center text-white text-[10px] font-semibold">
                      {iniciais(s.partnerName)}
                    </span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.partnerName}</span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex-shrink-0">{formatarEUR(s.profitEur)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        /* ===== Visão de detalhe do sócio selecionado ===== */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sf-kpi">
              <div className="flex items-center justify-between mb-3.5">
                <span className="sf-kpi-label">Lucro consolidado (R$) · {selected}</span>
                <span className="sf-kpi-icon sf-kpi-icon-green"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <p className="sf-kpi-value">{formatarMoedaBR(detailTotals.brl)}</p>
            </div>
            <div className="sf-kpi">
              <div className="flex items-center justify-between mb-3.5">
                <span className="sf-kpi-label">Lucro consolidado (€) · {selected}</span>
                <span className="sf-kpi-icon sf-kpi-icon-violet"><Euro className="w-4 h-4" /></span>
              </div>
              <p className="sf-kpi-value">{formatarEUR(detailTotals.eur)}</p>
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <h2 className="sf-card-title">Sociedades de {selected}</h2>
                <p className="sf-card-sub">Contas em que este sócio participa e o lucro em cada uma.</p>
              </div>
              <button onClick={clearSearch} className="sf-btn px-3 py-1.5 text-xs">Ver todos</button>
            </div>

            {detailLoading ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">Carregando...</div>
            ) : detail.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhuma sociedade encontrada para esse nome</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th className="!text-right">%</th>
                      <th className="!text-right">Lucro €</th>
                      <th className="!text-right">Lucro R$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map(d => (
                      <tr key={`${d.accountUsername}-${d.percentage}`}>
                        <td>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{d.accountName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">@{d.accountUsername}</p>
                        </td>
                        <td className="text-right font-mono text-[13px] text-slate-600 dark:text-slate-300">
                          {d.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                        </td>
                        <td className="text-right font-mono text-[13px] text-slate-700 dark:text-slate-300">{formatarEUR(d.profitEur)}</td>
                        <td className="text-right font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{formatarMoedaBR(d.profitBrl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ===== Visão geral (sem busca ativa) ===== */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sf-kpi">
              <div className="flex items-center justify-between mb-3.5">
                <span className="sf-kpi-label">Lucro total (R$)</span>
                <span className="sf-kpi-icon sf-kpi-icon-green"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <p className="sf-kpi-value">{formatarMoedaBR(totals.profitBrl)}</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">Consolidado de todas as contas</p>
            </div>
            <div className="sf-kpi">
              <div className="flex items-center justify-between mb-3.5">
                <span className="sf-kpi-label">Lucro total (€)</span>
                <span className="sf-kpi-icon sf-kpi-icon-violet"><Euro className="w-4 h-4" /></span>
              </div>
              <p className="sf-kpi-value">{formatarEUR(totals.profitEur)}</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">Antes da conversão para reais</p>
            </div>
            <div className="sf-kpi">
              <div className="flex items-center justify-between mb-3.5">
                <span className="sf-kpi-label">Sócios</span>
                <span className="sf-kpi-icon sf-kpi-icon-blue"><UsersIcon className="w-4 h-4" /></span>
              </div>
              <p className="sf-kpi-value">{rows.length}</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">Nomes distintos com lucro</p>
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="sf-card-title">Lucro por sócio</h2>
              <p className="sf-card-sub">
                Lucro distribuído por percentual de sociedade, somado por nome em todas as contas.
                Use a busca acima para ver o detalhe por conta.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">Carregando...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum lucro para distribuir ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Nome do Sócio</th>
                      <th className="!text-right">Lucro Total €</th>
                      <th className="!text-right">Lucro Total R$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.partnerName} className="cursor-pointer" onClick={() => selectPartner(r.partnerName)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                              {iniciais(r.partnerName)}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{r.partnerName}</span>
                          </div>
                        </td>
                        <td className="text-right font-mono text-[13px] text-slate-700 dark:text-slate-300">{formatarEUR(r.profitEur)}</td>
                        <td className="text-right font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{formatarMoedaBR(r.profitBrl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
