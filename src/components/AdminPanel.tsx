import { useCallback } from 'react'
import { Clock, CheckCircle2, Users as UsersIcon, ListOrdered } from 'lucide-react'
import { useAdminOverview } from '../hooks/useAdminOverview'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'

interface Props {
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

const CARD_COR: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
}

function TotalCard({ label, valorBRL, valorEUR, Icon, cor }: {
  label: string; valorBRL: string; valorEUR?: string; Icon: typeof Clock; cor: keyof typeof CARD_COR
}) {
  return (
    <div className="rounded-xl p-5 shadow-sm border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${CARD_COR[cor]}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="text-[26px] leading-tight font-bold text-slate-900 dark:text-white tabular-nums">{valorBRL}</p>
      {valorEUR && <p className="text-sm text-slate-400 dark:text-slate-500 tabular-nums">{valorEUR}</p>}
    </div>
  )
}

export function AdminPanel({ onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { rows, totals, loading } = useAdminOverview(handleError)

  return (
    <div className="space-y-5">
      {/* Totais consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalCard label="Total a receber" valorBRL={formatarMoedaBR(totals.pendingBrl)} valorEUR={formatarEUR(totals.pendingEur)} Icon={Clock} cor="amber" />
        <TotalCard label="Total recebido" valorBRL={formatarMoedaBR(totals.receivedBrl)} valorEUR={formatarEUR(totals.receivedEur)} Icon={CheckCircle2} cor="emerald" />
        <TotalCard label="Usuários" valorBRL={String(totals.users)} Icon={UsersIcon} cor="blue" />
        <TotalCard label="Lançamentos" valorBRL={String(totals.launches)} Icon={ListOrdered} cor="violet" />
      </div>

      {/* Lista por usuário */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Por usuário</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Totais de cada conta (a receber e já recebido)</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuário</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">A receber</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recebido</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lançamentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map(r => (
                  <tr key={r.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">{iniciais(r.displayName)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.displayName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{r.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <p className="font-semibold text-amber-600 dark:text-amber-400">{formatarMoedaBR(r.pendingBrl)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatarEUR(r.pendingEur)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatarMoedaBR(r.receivedBrl)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatarEUR(r.receivedEur)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300 tabular-nums">{r.count}</td>
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
