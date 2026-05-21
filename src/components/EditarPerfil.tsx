import { useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const inputClass = 'sf-input'

export function EditarPerfil({ isOpen, onClose, onToast }: Props) {
  const { currentUser, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '')
  const [salvandoNome, setSalvandoNome] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  if (!isOpen || !currentUser) return null

  const handleSalvarNome = async () => {
    if (!displayName.trim()) return
    setSalvandoNome(true)
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName.trim() })
      .eq('id', currentUser.userId)
    setSalvandoNome(false)
    if (error) {
      onToast('Erro ao salvar nome.', 'erro')
    } else {
      await refreshProfile()
      onToast('Nome atualizado!', 'sucesso')
    }
  }

  const handleTrocarSenha = async () => {
    setErroSenha('')
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErroSenha('Preencha todos os campos.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setErroSenha('Nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setTrocandoSenha(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: senhaAtual,
    })
    if (signInError) {
      setErroSenha('Senha atual incorreta.')
      setTrocandoSenha(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha })
    if (updateError) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
      setTrocandoSenha(false)
      return
    }

    await supabase
      .from('users')
      .update({ password_changed: true })
      .eq('id', currentUser.userId)

    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
    setTrocandoSenha(false)
    await refreshProfile()
    onToast('Senha alterada com sucesso!', 'sucesso')
  }

  return (
    <div className="sf-modal-overlay">
      <div className="sf-modal max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              {currentUser.displayName.slice(0, 2).toUpperCase() || currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{currentUser.displayName}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">@{currentUser.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Nome de exibição */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Informações pessoais
            </h4>
            <div className="space-y-3">
              <div>
                <label className="sf-label">Nome de exibição</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSalvarNome}
                disabled={salvandoNome || !displayName.trim() || displayName.trim() === currentUser.displayName}
                className="sf-btn-primary"
              >
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Alterar senha */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Alterar senha
            </h4>
            <div className="space-y-3">
              <div>
                <label className="sf-label">Senha atual</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="sf-label">Nova senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="sf-label">Confirmar nova senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={inputClass}
                />
              </div>

              {erroSenha && <p className="text-xs text-red-600 dark:text-red-400">✕ {erroSenha}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleTrocarSenha} disabled={trocandoSenha} className="sf-btn-primary">
                  {trocandoSenha ? 'Alterando...' : 'Alterar senha'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => !p)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPasswords ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
