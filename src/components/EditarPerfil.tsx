import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const inputClass = `w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {currentUser.displayName.slice(0, 2).toUpperCase() || currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{currentUser.displayName}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">@{currentUser.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Nome de exibição */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Informações pessoais
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Nome de exibição
                </label>
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
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Alterar senha */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Alterar senha
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Senha atual
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Nova senha
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Confirmar nova senha
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={inputClass}
                />
              </div>

              {erroSenha && (
                <p className="text-xs text-red-600 dark:text-red-400">✕ {erroSenha}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTrocarSenha}
                  disabled={trocandoSenha}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  {trocandoSenha ? 'Alterando...' : 'Alterar senha'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => !p)}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPasswords ? '🙈 Ocultar' : '👁 Mostrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
