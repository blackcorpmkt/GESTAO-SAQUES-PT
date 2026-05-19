import { useState } from 'react'
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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm">
          +
        </div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Novo Lançamento</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Data do Lançamento</label>
            <input
              type="date"
              value={dataVenda}
              onChange={e => setDataVenda(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nº de Vendas Aprovadas</label>
            <input
              type="number"
              min="1"
              value={numVendas}
              onChange={e => setNumVendas(e.target.value)}
              placeholder="Ex: 12"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Valor Bruto (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorBruto}
              onChange={e => setValorBruto(e.target.value)}
              placeholder="Ex: 359.64"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {temPreview && (
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-800 p-4 animate-fade-in">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">Preview do Lançamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">Líquido estimado</p>
                <p className="text-base font-bold text-blue-800 dark:text-blue-200">{formatarEUR(liquido)}</p>
                <p className="text-xs text-blue-400 dark:text-blue-500">- {formatarEUR(descontoTotal)} taxas</p>
              </div>
              <div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">Em reais</p>
                <p className="text-base font-bold text-blue-800 dark:text-blue-200">{cotacao ? formatarMoedaBR(valorBrl) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">Recebimento D+3</p>
                <p className="text-base font-bold text-blue-800 dark:text-blue-200">{dataRecebStr}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">Dia da semana</p>
                <p className="text-base font-bold text-blue-800 dark:text-blue-200">{diaSemanaReceb}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span>+</span> Adicionar Lançamento
          </button>
        </div>
      </form>
    </div>
  )
}
