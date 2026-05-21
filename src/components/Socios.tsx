import { useState } from 'react'
import { Plus, Pencil, Check, X, Handshake } from 'lucide-react'
import { Partner } from '../hooks/usePartners'

interface Props {
  partners: Partner[]
  loading: boolean
  onAdd: (name: string, percentage: number) => Promise<{ success: boolean }>
  onUpdate: (id: string, updates: { name?: string; percentage?: number; active?: boolean }) => Promise<{ success: boolean }>
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const inputClass = 'sf-input'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      title={value ? 'Desativar sócio' : 'Ativar sócio'}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function iniciais(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

export function Socios({ partners, loading, onAdd, onUpdate, onToast }: Props) {
  const [novoNome, setNovoNome] = useState('')
  const [novoPct, setNovoPct] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPct, setEditPct] = useState('')

  const totalAtivos = partners.filter(p => p.active).reduce((s, p) => s + p.percentage, 0)
  const totalFmt = totalAtivos.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  // Sócio principal = registro mais antigo (criado com 100% no signup). Ele sempre
  // fica com o percentual residual: 100 − soma dos demais sócios.
  const principal = partners.reduce<Partner | null>(
    (mais, p) => (!mais || p.createdAt < mais.createdAt ? p : mais),
    null,
  )

  const handleAdd = async () => {
    const nome = novoNome.trim()
    const pct = parseFloat(novoPct.replace(',', '.'))
    if (!nome) { onToast('Informe o nome do sócio.', 'erro'); return }
    if (isNaN(pct) || pct < 0 || pct > 100) { onToast('Percentual deve ser entre 0 e 100.', 'erro'); return }

    // Soma dos sócios que NÃO são o principal (o novo entrará nesse grupo)
    const outrosSum = partners
      .filter(p => p.id !== principal?.id)
      .reduce((s, p) => s + p.percentage, 0)

    if (principal && outrosSum + pct > 100) {
      const disponivel = (100 - outrosSum).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
      onToast(`A soma ultrapassaria 100%. Disponível para novos sócios: ${disponivel}%.`, 'erro')
      return
    }

    setSalvando(true)
    const r = await onAdd(nome, pct)
    // Recalcula o residual do principal automaticamente no banco
    if (r.success && principal) {
      const residual = Math.max(0, 100 - (outrosSum + pct))
      await onUpdate(principal.id, { percentage: residual })
    }
    setSalvando(false)
    if (r.success) {
      onToast('Sócio adicionado!', 'sucesso')
      setNovoNome('')
      setNovoPct('')
    }
  }

  const startEdit = (p: Partner) => {
    setEditId(p.id)
    setEditNome(p.name)
    setEditPct(String(p.percentage))
  }

  const saveEdit = async (p: Partner) => {
    const nome = editNome.trim()
    const pct = parseFloat(editPct.replace(',', '.'))
    if (!nome) { onToast('Informe o nome do sócio.', 'erro'); return }
    if (isNaN(pct) || pct < 0 || pct > 100) { onToast('Percentual deve ser entre 0 e 100.', 'erro'); return }
    const r = await onUpdate(p.id, { name: nome, percentage: pct })
    if (r.success) { onToast('Sócio atualizado!', 'sucesso'); setEditId(null) }
  }

  const toggleActive = async (p: Partner) => {
    const r = await onUpdate(p.id, { active: !p.active })
    if (r.success) onToast(p.active ? 'Sócio desativado' : 'Sócio ativado', 'info')
  }

  return (
    <div className="sf-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="sf-card-title">Sócios</h2>
        <p className="sf-card-sub">
          Seus sócios e percentuais — usados na divisão de lucro. {partners.length} cadastrado{partners.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Formulário de adição */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do sócio"
            className={`${inputClass} flex-1`}
          />
          <input
            type="number" min="0" max="100" step="0.01"
            value={novoPct}
            onChange={e => setNovoPct(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="%"
            className={`${inputClass} sm:w-28 tabular-nums`}
          />
          <button onClick={handleAdd} disabled={salvando} className="sf-btn-primary">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">Carregando...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-12">
          <Handshake className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum sócio cadastrado ainda</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {partners.map(p => (
            <div key={p.id} className={`flex items-center gap-3 px-5 py-3.5 ${!p.active ? 'opacity-60' : ''}`}>
              <span className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {iniciais(p.name)}
              </span>

              {editId === p.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input value={editNome} onChange={e => setEditNome(e.target.value)} className={`${inputClass} flex-1`} autoFocus />
                  <input type="number" min="0" max="100" step="0.01" value={editPct} onChange={e => setEditPct(e.target.value)} className={`${inputClass} sm:w-24 tabular-nums`} />
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(p)} title="Salvar" className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditId(null)} title="Cancelar" className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                      {p.id === principal?.id && (
                        <span className="sf-badge sf-badge-info flex-shrink-0">Principal</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {p.id === principal?.id ? 'Percentual residual (automático)' : p.active ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums w-16 text-right">{p.percentage}%</span>
                  <Toggle value={p.active} onChange={() => toggleActive(p)} />
                  <button onClick={() => startEdit(p)} title="Editar" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rodapé: soma total */}
      {!loading && partners.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Soma total (ativos):{' '}
            <span className={totalAtivos === 100 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-amber-600 dark:text-amber-400'}>
              {totalFmt}%
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
