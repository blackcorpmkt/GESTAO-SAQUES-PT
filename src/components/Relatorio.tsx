import { useState, useEffect } from 'react'
import { Lancamento } from '../types'
import { gerarRelatorio } from '../utils/relatorio'
import { formatarEUR, formatarMoedaBR, parseDateBR, getDiaSemanaVenda } from '../utils/formatacao'

interface Props {
  lancamentos: Lancamento[]
  nomeRelatorio: string
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

export function Relatorio({ lancamentos, nomeRelatorio, onToast }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const pendentes = lancamentos
    .filter(l => l.status === 'pendente')
    .sort((a, b) => parseDateBR(a.data_venda).getTime() - parseDateBR(b.data_venda).getTime())

  // Inicializa com todos pendentes selecionados
  useEffect(() => {
    setSelecionados(new Set(pendentes.map(l => l.id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancamentos.length])

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selecionarTodos = () => setSelecionados(new Set(pendentes.map(l => l.id)))
  const limparSelecao = () => setSelecionados(new Set())

  const lancamentosSelecionados = pendentes.filter(l => selecionados.has(l.id))
  const texto = gerarRelatorio(lancamentosSelecionados, nomeRelatorio)

  const handleCopiar = async () => {
    if (lancamentosSelecionados.length === 0) {
      onToast('Selecione ao menos um lançamento', 'erro')
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      onToast('Relatório copiado!', 'sucesso')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      onToast('Falha ao copiar. Selecione e copie manualmente.', 'erro')
    }
  }

  const handleExportar = () => {
    if (lancamentosSelecionados.length === 0) {
      onToast('Selecione ao menos um lançamento', 'erro')
      return
    }
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    a.href = url
    a.download = `relatorio_${nomeRelatorio.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dataHoje}.txt`
    a.click()
    URL.revokeObjectURL(url)
    onToast('Arquivo exportado!', 'sucesso')
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center text-base">
            📄
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Relatório de Fechamento</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {lancamentosSelecionados.length} de {pendentes.length} lançamento{pendentes.length !== 1 ? 's' : ''} selecionado{lancamentosSelecionados.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopiar}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm ${
              copiado
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
            }`}
          >
            {copiado ? '✓ Copiado!' : '⎘ Copiar'}
          </button>
          <button
            onClick={handleExportar}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all"
          >
            ↓ Baixar .txt
          </button>
        </div>
      </div>

      {/* Seleção de lançamentos */}
      {pendentes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum lançamento pendente para o relatório</p>
        </div>
      ) : (
        <>
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Selecionar lançamentos
            </p>
            <div className="flex gap-3">
              <button
                onClick={selecionarTodos}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Selecionar todos
              </button>
              <button
                onClick={limparSelecao}
                className="text-xs text-gray-400 dark:text-gray-500 hover:underline font-medium"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {pendentes.map(l => {
              const sel = selecionados.has(l.id)
              const diaSem = getDiaSemanaVenda(parseDateBR(l.data_venda))
              return (
                <label
                  key={l.id}
                  className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors ${
                    sel
                      ? 'bg-blue-50 dark:bg-blue-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleSelecionado(l.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{l.data_venda}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{diaSem}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">{l.num_vendas} vendas</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">aprovadas</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">{formatarEUR(l.valor_liquido_eur)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">líquido</p>
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatarMoedaBR(l.valor_brl)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Receb. {l.data_recebimento}</p>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Preview do relatório */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Preview do relatório
            </p>
            <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
              {texto}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
