import { useState } from 'react'
import { Check, RotateCcw, Trash2, Pencil, X, Inbox } from 'lucide-react'
import { Lancamento } from '../types'
import { formatarEUR, formatarMoedaBR, parseDateBR, formatDateBR, getDiaSemanaVenda } from '../utils/formatacao'
import { useAuth } from '../contexts/AuthContext'

type Filtro = 'todos' | 'pendente' | 'recebido'

interface Props {
  lancamentos: Lancamento[]
  onToggleStatus: (id: string) => void
  onDelete: (id: string) => void
  onUpdateCotacao: (id: string, novaCotacao: number) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function getRowStyle(l: Lancamento) {
  if (l.status === 'recebido') return 'bg-slate-50/60 dark:bg-slate-800/40'
  const hoje = formatDateBR(new Date())
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()
  if (parseDateBR(l.data_recebimento) < parseDateBR(hoje)) return 'bg-red-50/60 dark:bg-red-500/10'
  if (l.data_recebimento === hoje || l.data_recebimento === amanha) return 'bg-blue-50/60 dark:bg-blue-500/10'
  return 'bg-amber-50/50 dark:bg-amber-500/[0.07]'
}

function StatusBadge({ l }: { l: Lancamento }) {
  const hoje = formatDateBR(new Date())
  if (l.status === 'recebido') {
    return <span className="sf-badge sf-badge-success"><span className="sf-dot" /> Recebido</span>
  }
  if (parseDateBR(l.data_recebimento) < parseDateBR(hoje)) {
    return <span className="sf-badge sf-badge-danger"><span className="sf-dot" /> Vencido</span>
  }
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDateBR(d) })()
  if (l.data_recebimento === hoje) {
    return <span className="sf-badge sf-badge-info"><span className="sf-dot" /> Hoje</span>
  }
  if (l.data_recebimento === amanha) {
    return <span className="sf-badge sf-badge-info"><span className="sf-dot" /> Amanhã</span>
  }
  return <span className="sf-badge sf-badge-warning"><span className="sf-dot" /> Pendente</span>
}

export function LancamentosTable({ lancamentos, onToggleStatus, onDelete, onUpdateCotacao, onToast }: Props) {
  const { currentUser } = useAuth()
  const pct = currentUser?.role === 'user' ? (currentUser?.percentage ?? 0) : 0
  const showPct = pct > 0

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editandoCotacaoId, setEditandoCotacaoId] = useState<string | null>(null)
  const [cotacaoEdit, setCotacaoEdit] = useState('')

  const confirmarCotacao = (l: Lancamento) => {
    const val = parseFloat(cotacaoEdit.replace(',', '.'))
    if (isNaN(val) || val <= 0) {
      onToast('Cotação inválida. Use um valor maior que zero.', 'erro')
      return
    }
    onUpdateCotacao(l.id, val)
    onToast(`Cotação do lançamento ${l.data_venda} atualizada!`, 'sucesso')
    setEditandoCotacaoId(null)
  }

  const counts = {
    todos: lancamentos.length,
    pendente: lancamentos.filter(l => l.status === 'pendente').length,
    recebido: lancamentos.filter(l => l.status === 'recebido').length,
  }

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

  const chip = (id: Filtro, label: string) => (
    <button onClick={() => setFiltro(id)} className={`sf-chip ${filtro === id ? 'sf-chip-active' : ''}`}>
      {label}
      <span className="sf-chip-count">{counts[id]}</span>
    </button>
  )

  return (
    <div className="sf-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="sf-card-title">Lançamentos</h2>
          {filtrados.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} · {formatarMoedaBR(totalBRLFiltrado)} · {formatarEUR(totalFiltrado)}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          {chip('todos', 'Todos')}
          {chip('pendente', 'Pendentes')}
          {chip('recebido', 'Recebidos')}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Lançamento</th>
                <th className="!text-right">Vendas</th>
                <th className="!text-right">Bruto</th>
                <th className="!text-right">Líquido</th>
                <th className="!text-right">Em R$</th>
                <th>Recebimento D+3</th>
                <th className="!text-center">Status</th>
                <th className="!text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(l => {
                const dataVendaDate = parseDateBR(l.data_venda)
                const diaSem = getDiaSemanaVenda(dataVendaDate)
                return (
                  <tr key={l.id} className={getRowStyle(l)}>
                    <td>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{l.data_venda}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{diaSem}</p>
                    </td>
                    <td className="text-right">
                      <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{l.num_vendas}</span>
                    </td>
                    <td className="text-right text-slate-500 dark:text-slate-400 font-mono text-[13px]">
                      {formatarEUR(l.valor_bruto_eur)}
                    </td>
                    <td className="text-right">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[13px]">
                        {formatarEUR(l.valor_liquido_eur)}
                      </p>
                      {showPct && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                          {pct}% → {formatarEUR(l.valor_liquido_eur * pct / 100)}
                        </p>
                      )}
                    </td>
                    <td className="text-right">
                      {editandoCotacaoId === l.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={cotacaoEdit}
                            onChange={e => setCotacaoEdit(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmarCotacao(l)
                              else if (e.key === 'Escape') setEditandoCotacaoId(null)
                            }}
                            autoFocus
                            placeholder="5.83"
                            className="w-20 rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs text-right bg-white dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 tabular-nums"
                          />
                          <button
                            onClick={() => confirmarCotacao(l)}
                            title="Confirmar nova cotação"
                            className="w-6 h-6 grid place-items-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditandoCotacaoId(null)}
                            title="Cancelar"
                            className="w-6 h-6 grid place-items-center rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="text-right">
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[13px]">
                              {formatarMoedaBR(l.valor_brl)}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              @ {l.cotacao_eur_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <button
                            onClick={() => { setEditandoCotacaoId(l.id); setCotacaoEdit(String(l.cotacao_eur_brl)) }}
                            title="Editar cotação deste lançamento"
                            className="w-6 h-6 grid place-items-center rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{l.data_recebimento}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{l.dia_semana_recebimento}</p>
                    </td>
                    <td className="text-center">
                      <StatusBadge l={l} />
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {l.status === 'pendente' ? (
                          <button
                            onClick={() => handleToggle(l)}
                            title="Confirmar que o saque foi recebido"
                            className="sf-btn-success px-3 py-1.5 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirmar Saque
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(l)}
                            title="Reverter para pendente"
                            className="sf-btn px-3 py-1.5 text-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Desfazer
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(l.id)}
                          title={confirmDelete === l.id ? 'Clique para confirmar exclusão' : 'Excluir lançamento'}
                          className={`w-8 h-8 grid place-items-center rounded-lg transition-all ${
                            confirmDelete === l.id
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 dark:bg-blue-500/60 inline-block" /> Hoje / Amanhã</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 dark:bg-red-500/60 inline-block" /> Vencido</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 dark:bg-amber-500/60 inline-block" /> Pendente</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" /> Recebido</span>
      </div>
    </div>
  )
}
