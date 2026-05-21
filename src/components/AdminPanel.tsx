import { useCallback } from 'react'
import { Clock, CheckCircle2, Users as UsersIcon, ListOrdered, type LucideIcon } from 'lucide-react'
import { useAdminOverview } from '../hooks/useAdminOverview'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'

type Tone = 'blue' | 'green' | 'amber' | 'violet'

interface Props {
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function TotalCard({ label, valorBRL, valorEUR, Icon, tone }: {
  label: string; valorBRL: string; valorEUR?: string; Icon: LucideIcon; tone: Tone
}) {
  return (
    <div className="sf-kpi">
      <div className="flex items-center justify-between mb-3.5">
        <span className="sf-kpi-label">{label}</span>
        <span className={`sf-kpi-icon sf-kpi-icon-${tone}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="sf-kpi-value">{valorBRL}</p>
      {valorEUR && <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tabular-nums mt-1.5">{valorEUR}</p>}
    </div>
  )
}

export function AdminPanel({ onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { rows, totals, loading } = useAdminOverview(handleError)

  return (
    <div className="space-y-6">
      {/* Totais consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalCard label="Total a receber" valorBRL={formatarMoedaBR(totals.pendingBrl)} valorEUR={formatarEUR(totals.pendingEur)} Icon={Clock} tone="amber" />
        <TotalCard label="Total recebido" valorBRL={formatarMoedaBR(totals.receivedBrl)} valorEUR={formatarEUR(totals.receivedEur)} Icon={CheckCircle2} tone="green" />
        <TotalCard label="Usuários" valorBRL={String(totals.users)} Icon={UsersIcon} tone="blue" />
        <TotalCard label="Lançamentos" valorBRL={String(totals.launches)} Icon={ListOrdered} tone="violet" />
      </div>

      {/* Lista por usuário */}
      <div className="sf-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="sf-card-title">Por usuário</h2>
          <p className="sf-card-sub">Totais de cada conta (a receber e já recebido)</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th className="!text-right">A receber</th>
                  <th className="!text-right">Recebido</th>
                  <th className="!text-center">Lançamentos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.userId}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">{iniciais(r.displayName)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.displayName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{r.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">
                      <p className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[13px]">{formatarMoedaBR(r.pendingBrl)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{formatarEUR(r.pendingEur)}</p>
                    </td>
                    <td className="text-right tabular-nums">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[13px]">{formatarMoedaBR(r.receivedBrl)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{formatarEUR(r.receivedEur)}</p>
                    </td>
                    <td className="text-center font-medium text-slate-700 dark:text-slate-300 tabular-nums">{r.count}</td>
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
