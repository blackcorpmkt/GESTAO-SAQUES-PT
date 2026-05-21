import { useState, useEffect } from 'react'
import { FileText, Copy, Check, Download, Inbox } from 'lucide-react'
import { Lancamento } from '../types'
import { LaunchCost } from '../hooks/useLaunchCosts'
import { Partner } from '../hooks/usePartners'
import { gerarRelatorio } from '../utils/relatorio'
import { formatarEUR, formatarMoedaBR, parseDateBR, getDiaSemanaVenda } from '../utils/formatacao'

interface Props {
  lancamentos: Lancamento[]
  nomeRelatorio: string
  costs: LaunchCost[]
  partners: Partner[]
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

export function Relatorio({ lancamentos, nomeRelatorio, costs, partners, onToast }: Props) {
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
  const texto = gerarRelatorio(lancamentosSelecionados, nomeRelatorio, costs, partners)

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
    <div className="sf-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="sf-kpi-icon sf-kpi-icon-violet">
            <FileText className="w-[18px] h-[18px]" />
          </span>
          <div>
            <h2 className="sf-card-title">Relatório de Fechamento</h2>
            <p className="sf-card-sub">
              {lancamentosSelecionados.length} de {pendentes.length} lançamento{pendentes.length !== 1 ? 's' : ''} selecionado{lancamentosSelecionados.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopiar} className={copiado ? 'sf-btn-success' : 'sf-btn-primary'}>
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={handleExportar} className="sf-btn-success">
            <Download className="w-4 h-4" /> Baixar .txt
          </button>
        </div>
      </div>

      {/* Seleção de lançamentos */}
      {pendentes.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum lançamento pendente para o relatório</p>
        </div>
      ) : (
        <>
          <div className="px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Selecionar lançamentos
            </p>
            <div className="flex gap-3">
              <button onClick={selecionarTodos} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Selecionar todos
              </button>
              <button onClick={limparSelecao} className="text-xs text-slate-400 dark:text-slate-500 hover:underline font-medium">
                Limpar
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {pendentes.map(l => {
              const sel = selecionados.has(l.id)
              const diaSem = getDiaSemanaVenda(parseDateBR(l.data_venda))
              return (
                <label
                  key={l.id}
                  className={`flex items-center gap-4 px-5 sm:px-6 py-3.5 cursor-pointer transition-colors ${
                    sel
                      ? 'bg-blue-50/70 dark:bg-blue-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleSelecionado(l.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{l.data_venda}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{diaSem}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-300">{l.num_vendas} vendas</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">aprovadas</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 font-mono text-[13px]">{formatarEUR(l.valor_liquido_eur)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">líquido</p>
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[13px]">{formatarMoedaBR(l.valor_brl)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Receb. {l.data_recebimento}</p>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
