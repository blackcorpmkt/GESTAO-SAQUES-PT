import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Lancamento } from '../types'
import { addDiasUteis, calcularLiquido } from '../utils/calculos'
import { formatDateBR, formatDateInput, getDiaSemana, formatarEUR, formatarMoedaBR } from '../utils/formatacao'

interface Props {
  cotacao: number | null
  taxaGateway: number
  taxaFixaEur: number
  onAdd: (lancamento: Lancamento) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

export function LancamentoForm({ cotacao, taxaGateway, taxaFixaEur, onAdd, onToast }: Props) {
  const hoje = formatDateInput(new Date())
  const [dataVenda, setDataVenda] = useState(hoje)
  const [numVendas, setNumVendas] = useState('')
  const [valorBruto, setValorBruto] = useState('')

  const bruto = parseFloat(valorBruto.replace(',', '.')) || 0
  const numV = parseInt(numVendas) || 0
  const liquido = bruto > 0 && numV > 0 ? calcularLiquido(bruto, taxaGateway, taxaFixaEur, numV) : 0
  const valorBrl = cotacao ? liquido * cotacao : 0
  const descontoTotal = bruto - liquido

  const dataVendaDate = dataVenda ? new Date(dataVenda + 'T12:00:00') : new Date()
  const dataReceb = addDiasUteis(dataVendaDate, 3)
  const dataRecebStr = formatDateBR(dataReceb)
  const diaSemanaReceb = getDiaSemana(dataReceb)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataVenda || !numVendas || !valorBruto) {
      onToast('Preencha todos os campos', 'erro')
      return
    }
    if (numV <= 0 || bruto <= 0) {
      onToast('Valores devem ser maiores que zero', 'erro')
      return
    }
    if (!cotacao) {
      onToast('Cotação indisponível. Defina a cotação manual no painel.', 'erro')
      return
    }

    const dataVendaObj = new Date(dataVenda + 'T12:00:00')
    const liquido = calcularLiquido(bruto, taxaGateway, taxaFixaEur, numV)
    const dataRecebObj = addDiasUteis(dataVendaObj, 3)

    const lancamento: Lancamento = {
      id: crypto.randomUUID(),
      data_venda: formatDateBR(dataVendaObj),
      num_vendas: numV,
      valor_bruto_eur: bruto,
      valor_liquido_eur: liquido,
      taxa_gateway: taxaGateway,
      taxa_fixa_eur: taxaFixaEur,
      data_recebimento: formatDateBR(dataRecebObj),
      dia_semana_recebimento: getDiaSemana(dataRecebObj),
      cotacao_eur_brl: cotacao,
      valor_brl: liquido * cotacao,
      status: 'pendente',
      created_at: new Date().toISOString(),
    }

    onAdd(lancamento)
    onToast('Lançamento adicionado com sucesso!')
    setNumVendas('')
    setValorBruto('')
    setDataVenda(hoje)
  }

  const temPreview = bruto > 0 && numV > 0

  return (
    <div className="sf-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="sf-kpi-icon sf-kpi-icon-blue">
          <Plus className="w-[18px] h-[18px]" />
        </span>
        <h2 className="sf-card-title">Novo Lançamento</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="sf-label">Data do Lançamento</label>
            <input
              type="date"
              value={dataVenda}
              onChange={e => setDataVenda(e.target.value)}
              className="sf-input"
            />
          </div>
          <div>
            <label className="sf-label">Nº de Vendas Aprovadas</label>
            <input
              type="number"
              min="1"
              value={numVendas}
              onChange={e => setNumVendas(e.target.value)}
              placeholder="Ex: 12"
              className="sf-input tabular-nums"
            />
          </div>
          <div>
            <label className="sf-label">Valor Bruto (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorBruto}
              onChange={e => setValorBruto(e.target.value)}
              placeholder="Ex: 359.64"
              className="sf-input tabular-nums"
            />
          </div>
        </div>

        {temPreview && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 p-4 animate-fade-in">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">
              Preview do Lançamento
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-blue-500/80 dark:text-blue-400 mb-0.5">Líquido estimado</p>
                <p className="text-base font-semibold text-blue-900 dark:text-blue-100 font-mono">{formatarEUR(liquido)}</p>
                <p className="text-xs text-blue-400 dark:text-blue-500/80">- {formatarEUR(descontoTotal)} taxas</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/80 dark:text-blue-400 mb-0.5">Em reais</p>
                <p className="text-base font-semibold text-blue-900 dark:text-blue-100 font-mono">{cotacao ? formatarMoedaBR(valorBrl) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/80 dark:text-blue-400 mb-0.5">Recebimento D+3</p>
                <p className="text-base font-semibold text-blue-900 dark:text-blue-100">{dataRecebStr}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500/80 dark:text-blue-400 mb-0.5">Dia da semana</p>
                <p className="text-base font-semibold text-blue-900 dark:text-blue-100">{diaSemanaReceb}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="sf-btn-primary px-5 py-2.5">
            <Plus className="w-4 h-4" /> Adicionar Lançamento
          </button>
        </div>
      </form>
    </div>
  )
}
