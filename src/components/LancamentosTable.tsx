import { useState } from 'react'
import { Lancamento } from '../types'
import { formatarEUR, formatarMoedaBR, parseDateBR, formatDateBR, getDiaSemanaVenda } from '../utils/formatacao'
import { useAuth } from '../contexts/AuthContext'

type Filtro = 'todos' | 'pendente' | 'recebido'

interface Props {
  lancamentos: Lancamento[]
  onToggleStatus: (id: string) => void
  onDelete: (id: string) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function getRowStyle(l: Lancamento) {
  if (l.status === 'recebido') return 'bg-gray-50 dark:bg-gray-800/50'
  const hoje = formatDateBR(new Date())
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()
  if (parseDateBR(l.data_recebimento) < parseDateBR(hoje)) return 'bg-red-50 dark:bg-red-950/30'
  if (l.data_recebimento === hoje || l.data_recebimento === amanha) return 'bg-blue-50 dark:bg-blue-950/30'
  return 'bg-amber-50 dark:bg-amber-950/20'
}

function StatusBadge({ l }: { l: Lancamento }) {
  const hoje = formatDateBR(new Date())
  if (l.status === 'recebido') {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">✓ Recebido</span>
  }
  if (parseDateBR(l.data_recebimento) < parseDateBR(hoje)) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">⚠ Vencido</span>
  }
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()
  if (l.data_recebimento === hoje) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">📅 Hoje</span>
  }
  if (l.data_recebimento === amanha) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">📅 Amanhã</span>
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">⏳ Pendente</span>
}

export function LancamentosTable({ lancamentos, onToggleStatus, onDelete, onToast }: Props) {
  const { currentUser } = useAuth()
  const pct = currentUser?.role === 'user' ? (currentUser?.percentage ?? 0) : 0
  const showPct = pct > 0

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtrados = lancamentos
    .filter(l => filtro === 'todos' ? true : l.status === filtro)
    .sort((a, b) => parseDateBR(b.data_venda).getTime() - parseDateBR(a.data_venda).getTime())

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id)
      onToast('Lançamento removido', 'info')
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleToggle = (l: Lancamento) => {
    onToggleStatus(l.id)
    onToast(l.status === 'pendente' ? 'Saque confirmado como recebido!' : 'Revertido para pendente', 'sucesso')
  }

  const totalFiltrado = filtrados.reduce((s, l) => s + l.valor_liquido_eur, 0)
  const totalBRLFiltrado = filtrados.reduce((s, l) => s + l.valor_brl, 0)

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Lançamentos</h2>
          {filtrados.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} · {formatarMoedaBR(totalBRLFiltrado)} · {formatarEUR(totalFiltrado)}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {(['todos', 'pendente', 'recebido'] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtro === f
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Recebidos'}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lançamento</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vendas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bruto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Líquido</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Em R$</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recebimento D+3</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtrados.map(l => {
                const dataVendaDate = parseDateBR(l.data_venda)
                const diaSem = getDiaSemanaVenda(dataVendaDate)
                return (
                  <tr key={l.id} className={`${getRowStyle(l)} transition-colors`}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{l.data_venda}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{diaSem}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{l.num_vendas}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                      {formatarEUR(l.valor_bruto_eur)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                        {formatarEUR(l.valor_liquido_eur)}
                      </p>
                      {showPct && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">
                          {pct}% → {formatarEUR(l.valor_liquido_eur * pct / 100)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatarMoedaBR(l.valor_brl)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{l.data_recebimento}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{l.dia_semana_recebimento}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge l={l} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {l.status === 'pendente' ? (
                          <button
                            onClick={() => handleToggle(l)}
                            title="Confirmar que o saque foi recebido"
                            className="
                              inline-flex items-center gap-1.5
                              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                              text-white text-xs font-semibold
                              px-3 py-1.5 rounded-lg
                              shadow-sm hover:shadow-md
                              transition-all duration-150
                              whitespace-nowrap
                            "
                          >
                            <span>✓</span>
                            <span>Confirmar Saque</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(l)}
                            title="Reverter para pendente"
                            className="
                              inline-flex items-center gap-1.5
                              bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                              text-gray-600 dark:text-gray-300 text-xs font-medium
                              px-3 py-1.5 rounded-lg
                              transition-all duration-150
                              whitespace-nowrap
                            "
                          >
                            <span>↩</span>
                            <span>Desfazer</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(l.id)}
                          title={confirmDelete === l.id ? 'Clique para confirmar exclusão' : 'Excluir lançamento'}
                          className={`
                            text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all
                            ${confirmDelete === l.id
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400'
                            }
                          `}
                        >
                          {confirmDelete === l.id ? '!' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800 inline-block" /> Hoje / Amanhã</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800 inline-block" /> Vencido</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-800 inline-block" /> Pendente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-600 inline-block" /> Recebido</span>
      </div>
    </div>
  )
}
