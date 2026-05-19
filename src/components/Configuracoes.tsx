import { useState, useRef } from 'react'
import { Config, Lancamento } from '../types'
import { clearAll } from '../utils/storage'

interface Props {
  config: Config
  onUpdateConfig: (updates: Partial<Config>) => void
  onResetConfig: () => void
  lancamentos: Lancamento[]
  onImport: (data: Lancamento[]) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function Section({ titulo, icon, children }: { titulo: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

export function Configuracoes({ config, onUpdateConfig, onResetConfig, lancamentos, onImport, onToast }: Props) {
  const [taxaInput, setTaxaInput] = useState(config.taxa_gateway.toString())
  const [taxaFixaInput, setTaxaFixaInput] = useState(config.taxa_fixa_eur.toString())
  const [nomeInput, setNomeInput] = useState(config.nome_relatorio)
  const [cotacaoInput, setCotacaoInput] = useState(config.cotacao_manual?.toString() ?? '')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const inputClass = `w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
    bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`

  const handleSalvar = () => {
    const taxa = parseFloat(taxaInput)
    const taxaFixa = parseFloat(taxaFixaInput)
    const cotacao = cotacaoInput ? parseFloat(cotacaoInput) : null
    if (isNaN(taxa) || taxa < 0 || taxa >= 100) {
      onToast('Taxa percentual inválida (deve ser entre 0 e 100)', 'erro')
      return
    }
    if (isNaN(taxaFixa) || taxaFixa < 0) {
      onToast('Taxa fixa inválida (deve ser ≥ 0)', 'erro')
      return
    }
    onUpdateConfig({
      taxa_gateway: taxa,
      taxa_fixa_eur: taxaFixa,
      nome_relatorio: nomeInput.trim() || 'OP | PORTUGAL',
      cotacao_manual: cotacao,
    })
    onToast('Configurações salvas!', 'sucesso')
  }

  const handleExportarJSON = () => {
    const blob = new Blob([JSON.stringify(lancamentos, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_gestao_saques_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    onToast('Backup exportado!', 'sucesso')
  }

  const handleImportarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Formato inválido')
        onImport(data as Lancamento[])
        onToast(`${data.length} lançamentos importados!`, 'sucesso')
      } catch {
        onToast('Falha ao importar. Verifique o arquivo JSON.', 'erro')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    clearAll()
    onResetConfig()
    onToast('Dados resetados para o padrão', 'info')
    setConfirmReset(false)
    setTaxaInput('28')
    setTaxaFixaInput('2')
    setNomeInput('OP | PORTUGAL')
    setCotacaoInput('')
  }

  return (
    <div className="space-y-5">
      <Section titulo="Configurações do Gateway" icon="⚙️">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Taxa percentual do Gateway (%)" hint="Desconto sobre o valor bruto. Padrão: 28%">
            <input type="number" step="0.01" min="0" max="99" value={taxaInput} onChange={e => setTaxaInput(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Taxa fixa por venda (€)" hint="Valor fixo descontado por cada venda aprovada. Padrão: € 2,00">
            <input type="number" step="0.01" min="0" value={taxaFixaInput} onChange={e => setTaxaFixaInput(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mb-5">
          <strong>Cálculo do líquido:</strong> Bruto − (Bruto × {taxaInput || 0}%) − (€{taxaFixaInput || 0} × nº vendas)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Nome no relatório" hint='Aparece como "VENDAS [NOME]" no cabeçalho do relatório'>
            <input type="text" value={nomeInput} onChange={e => setNomeInput(e.target.value)} placeholder="OP | PORTUGAL" className={inputClass} />
          </Field>
          <Field label="Cotação manual EUR/BRL" hint="Usada automaticamente quando a API estiver indisponível">
            <input type="number" step="0.0001" min="0" value={cotacaoInput} onChange={e => setCotacaoInput(e.target.value)} placeholder="Ex: 6.2134" className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSalvar}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            Salvar Configurações
          </button>
          <button
            onClick={handleReset}
            className={`text-sm font-medium px-5 py-2.5 rounded-xl transition-all ${
              confirmReset
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {confirmReset ? 'Confirmar Reset' : 'Resetar Padrão'}
          </button>
        </div>
      </Section>

      <Section titulo="Dados e Backup" icon="💾">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} armazenado{lancamentos.length !== 1 ? 's' : ''} no navegador (localStorage).
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Os dados persistem mesmo após fechar o browser ou reiniciar o computador. Só são perdidos se limpar os dados do site manualmente.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportarJSON}
            disabled={lancamentos.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            ↓ Exportar Backup JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            ↑ Importar JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />
        </div>
      </Section>
    </div>
  )
}
