import { useCallback } from 'react'
import { TrendingUp, Euro, Users as UsersIcon } from 'lucide-react'
import { useAdminProfit } from '../hooks/useAdminProfit'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'

interface Props {
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export function AdminLucros({ onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { rows, totals, loading } = useAdminProfit(handleError)

  return (
    <div className="space-y-6">
      {/* Cards de total geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="sf-kpi">
          <div className="flex items-center justify-between mb-3.5">
            <span className="sf-kpi-label">Lucro total (R$)</span>
            <span className="sf-kpi-icon sf-kpi-icon-green"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <p className="sf-kpi-value">{formatarMoedaBR(totals.profitBrl)}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">
            Consolidado de todas as contas
          </p>
        </div>

        <div className="sf-kpi">
          <div className="flex items-center justify-between mb-3.5">
            <span className="sf-kpi-label">Lucro total (€)</span>
            <span className="sf-kpi-icon sf-kpi-icon-violet"><Euro className="w-4 h-4" /></span>
          </div>
          <p className="sf-kpi-value">{formatarEUR(totals.profitEur)}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">
            Antes da conversão para reais
          </p>
        </div>

        <div className="sf-kpi">
          <div className="flex items-center justify-between mb-3.5">
            <span className="sf-kpi-label">Sócios</span>
            <span className="sf-kpi-icon sf-kpi-icon-blue"><UsersIcon className="w-4 h-4" /></span>
          </div>
          <p className="sf-kpi-value">{rows.length}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">
            Nomes distintos com lucro
          </p>
        </div>
      </div>

      {/* Tabela por sócio */}
      <div className="sf-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="sf-card-title">Lucro por sócio</h2>
          <p className="sf-card-sub">
            Lucro distribuído por percentual de sociedade, somado por nome em todas as contas.
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
                  <tr key={r.partnerName}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {iniciais(r.partnerName)}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{r.partnerName}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono text-[13px] text-slate-700 dark:text-slate-300">
                      {formatarEUR(r.profitEur)}
                    </td>
                    <td className="text-right font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatarMoedaBR(r.profitBrl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
