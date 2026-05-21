import { useState, useRef, useEffect } from 'react'
import { Lock, SlidersHorizontal, Database, Download, Upload, AlertTriangle, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { Config, Lancamento } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

type Tone = 'blue' | 'green' | 'amber' | 'violet'

interface Props {
  config: Config
  onUpdateConfig: (updates: Partial<Config>) => void
  onResetConfig: () => void
  lancamentos: Lancamento[]
  onImport: (data: Lancamento[]) => Promise<void>
  onApplyCotacaoPendentes: (novaCotacao: number) => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

function Section({ titulo, Icon, tone, children }: { titulo: string; Icon: LucideIcon; tone: Tone; children: React.ReactNode }) {
  return (
    <div className="sf-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className={`sf-kpi-icon sf-kpi-icon-${tone}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <h2 className="sf-card-title">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="sf-label">{label}</label>
      {children}
      {hint && <p className="sf-hint">{hint}</p>}
    </div>
  )
}

export function Configuracoes({ config, onUpdateConfig, onResetConfig, lancamentos, onImport, onApplyCotacaoPendentes, onToast }: Props) {
  const { currentUser, refreshProfile } = useAuth()

  // Configurações gerais
  const [taxaInput, setTaxaInput] = useState(config.taxa_gateway.toString())
  const [taxaFixaInput, setTaxaFixaInput] = useState(config.taxa_fixa_eur.toString())
  const [nomeInput, setNomeInput] = useState(config.nome_relatorio)
  const [cotacaoInput, setCotacaoInput] = useState(config.cotacao_manual?.toString() ?? '')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Mantém os inputs em sincronia com o config (carregado de forma assíncrona do Supabase).
  // Sem isso, os campos ficam presos ao valor inicial e podem sobrescrever o config ao salvar
  // — em especial zerando a cotação, que era a causa dos valores zerados em novos lançamentos.
  useEffect(() => {
    setTaxaInput(config.taxa_gateway.toString())
    setTaxaFixaInput(config.taxa_fixa_eur.toString())
    setNomeInput(config.nome_relatorio)
    setCotacaoInput(config.cotacao_manual?.toString() ?? '')
  }, [config.taxa_gateway, config.taxa_fixa_eur, config.nome_relatorio, config.cotacao_manual])

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  const inputClass = 'sf-input'

  // Aviso de senha padrão: qualquer usuário que ainda não trocou a senha
  const usingDefaultPassword = !currentUser?.passwordChanged

  const handleSalvarConfig = () => {
    const taxa = parseFloat(taxaInput)
    const taxaFixa = parseFloat(taxaFixaInput)
    const cotacao = cotacaoInput ? parseFloat(cotacaoInput.replace(',', '.')) : null
    if (isNaN(taxa) || taxa < 0 || taxa >= 100) {
      onToast('Taxa percentual inválida (0–100)', 'erro')
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

  const handleTrocarSenha = async () => {
    setErroSenha('')
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErroSenha('Preencha todos os campos.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha('A nova senha e a confirmação não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setErroSenha('Nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!currentUser) return

    setTrocandoSenha(true)

    // Verifica senha atual via re-autenticação
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: senhaAtual,
    })
    if (signInError) {
      setErroSenha('Senha atual incorreta.')
      setTrocandoSenha(false)
      return
    }

    // Atualiza a senha no Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha })
    if (updateError) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
      setTrocandoSenha(false)
      return
    }

    // Marca no perfil que a senha foi alterada (remove o aviso de senha padrão)
    await supabase
      .from('users')
      .update({ password_changed: true })
      .eq('id', currentUser.userId)

    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setTrocandoSenha(false)
    onToast('Senha alterada com sucesso!', 'sucesso')
    await refreshProfile()
  }

  const handleAplicarCotacaoPendentes = () => {
    const cot = cotacaoInput ? parseFloat(cotacaoInput.replace(',', '.')) : null
    if (cot == null || isNaN(cot) || cot <= 0) {
      onToast('Defina uma cotação válida acima antes de aplicar.', 'erro')
      return
    }
    const qtd = lancamentos.filter(l => l.status === 'pendente').length
    if (qtd === 0) {
      onToast('Nenhum lançamento pendente para atualizar.', 'info')
      return
    }
    onApplyCotacaoPendentes(cot)
    const cotFmt = cot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    onToast(`Cotação R$ ${cotFmt} aplicada a ${qtd} lançamento${qtd !== 1 ? 's' : ''} pendente${qtd !== 1 ? 's' : ''}!`, 'sucesso')
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
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Formato inválido')
        await onImport(data as Lancamento[])
        onToast(`${data.length} lançamentos importados!`, 'sucesso')
      } catch {
        onToast('Falha ao importar. Verifique o arquivo JSON.', 'erro')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    // Limpa todos os lançamentos e reseta config
    await onImport([])
    onResetConfig()
    onToast('Dados resetados para o padrão', 'info')
    setConfirmReset(false)
    setTaxaInput('28')
    setTaxaFixaInput('2')
    setNomeInput('OP | PORTUGAL')
    setCotacaoInput('')
  }

  const taxaNum = parseFloat(taxaInput) || 0
  const taxaFixaNum = parseFloat(taxaFixaInput) || 0

  return (
    <div className="space-y-6">
      {/* Aviso senha padrão */}
      {usingDefaultPassword && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Você está usando a senha padrão do administrador
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Por segurança, altere sua senha na seção abaixo antes de continuar usando o sistema.
            </p>
          </div>
        </div>
      )}

      {/* Segurança da conta */}
      <Section titulo="Segurança da Conta" Icon={Lock} tone="blue">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Field label="Senha atual">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>
          <Field label="Nova senha">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mín. 6 caracteres"
              className={inputClass}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="Repita a nova senha"
              className={inputClass}
            />
          </Field>
        </div>
        {erroSenha && <p className="text-xs text-red-600 dark:text-red-400 mb-3">✕ {erroSenha}</p>}
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={handleTrocarSenha} disabled={trocandoSenha} className="sf-btn-primary px-5 py-2.5">
            {trocandoSenha ? 'Alterando...' : 'Alterar Senha'}
          </button>
          <button
            onClick={() => setShowPasswords(p => !p)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
          </button>
        </div>
      </Section>

      {/* Gateway */}
      <Section titulo="Gateway de Pagamento" Icon={SlidersHorizontal} tone="violet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field label="Taxa percentual (%)" hint="Desconto proporcional ao valor bruto. Padrão: 28%">
            <input
              type="number" step="0.01" min="0" max="99"
              value={taxaInput} onChange={e => setTaxaInput(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Taxa fixa por venda (€)" hint="Desconto fixo por cada venda aprovada. Padrão: € 2,00">
            <input
              type="number" step="0.01" min="0"
              value={taxaFixaInput} onChange={e => setTaxaFixaInput(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 mb-5 font-mono">
          Líquido = Bruto − (Bruto × {taxaNum}%) − (€{taxaFixaNum} × nº vendas)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Nome no relatório" hint='Aparece como "VENDAS [NOME]" no cabeçalho'>
            <input
              type="text" value={nomeInput}
              onChange={e => setNomeInput(e.target.value)}
              placeholder="OP | PORTUGAL"
              className={inputClass}
            />
          </Field>
          <Field label="Cotação EUR/BRL" hint="Usada em todos os cálculos de conversão para reais">
            <input
              type="text" inputMode="decimal"
              value={cotacaoInput} onChange={e => setCotacaoInput(e.target.value)}
              placeholder="Ex: 5.83"
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aplicar cotação aos pendentes</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Recalcula o valor em R$ de todos os lançamentos pendentes usando a cotação acima.
            </p>
          </div>
          <button type="button" onClick={handleAplicarCotacaoPendentes} className="sf-btn-success px-4 py-2.5">
            Aplicar a todos os pendentes
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleSalvarConfig} className="sf-btn-primary px-5 py-2.5">
            Salvar Configurações
          </button>
          <button
            onClick={handleReset}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
              confirmReset
                ? 'bg-red-500 text-white animate-pulse'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            {confirmReset ? 'Confirmar Reset' : 'Resetar Padrão'}
          </button>
        </div>
      </Section>

      {/* Dados e backup */}
      <Section titulo="Dados e Backup" Icon={Database} tone="green">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} armazenado{lancamentos.length !== 1 ? 's' : ''} no Supabase.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
          Os dados são sincronizados em tempo real e ficam seguros na nuvem.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportarJSON} disabled={lancamentos.length === 0} className="sf-btn-success px-5 py-2.5">
            <Download className="w-4 h-4" /> Exportar Backup JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="sf-btn px-5 py-2.5">
            <Upload className="w-4 h-4" /> Importar JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />
        </div>
      </Section>
    </div>
  )
}
