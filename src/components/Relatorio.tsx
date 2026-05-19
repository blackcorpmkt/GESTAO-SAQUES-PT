import { useState } from 'react'
import { Lancamento } from '../types'
import { gerarRelatorio } from '../utils/relatorio'

interface Props {
  lancamentos: Lancamento[]
  nomeRelatorio: string
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

export function Relatorio({ lancamentos, nomeRelatorio, onToast }: Props) {
  const [copiado, setCopiado] = useState(false)

  const pendentes = lancamentos.filter(l => l.status === 'pendente')
  const texto = gerarRelatorio(lancamentos, nomeRelatorio)
  const temPendentes = pendentes.length > 0

  const handleCopiar = async () => {
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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 text-sm">
            📄
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Relatório de Fechamento</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {temPendentes
                ? `${pendentes.length} lançamento${pendentes.length !== 1 ? 's' : ''} pendente${pendentes.length !== 1 ? 's' : ''}`
                : 'Sem lançamentos pendentes'}
            </p>
          </div>
        </div>
        {temPendentes && (
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
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              ↓ Exportar .txt
            </button>
          </div>
        )}
      </div>

      <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
        {texto}
      </pre>
    </div>
  )
}
