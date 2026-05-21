import { useState, useCallback } from 'react'
import { UserRecord } from '../types/auth'
import { useUsers } from '../hooks/useUsers'

interface Props {
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

type ModalState =
  | null
  | { type: 'create' }
  | { type: 'edit'; user: UserRecord }
  | { type: 'resetPassword'; user: UserRecord }

const inputClass = `w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`

function ModalOverlay({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'user' }) {
  return role === 'admin'
    ? <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Admin</span>
    : <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Usuário</span>
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Ativo</span>
    : <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">Inativo</span>
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function GerenciamentoUsuarios({ onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { users, loading, createUser, updateUser, resetPassword } = useUsers(handleError)

  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  // Estado do formulário de criação
  const [createForm, setCreateForm] = useState({
    display_name: '',
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  })
  const [createError, setCreateError] = useState('')

  // Estado do formulário de edição
  const [editForm, setEditForm] = useState({ display_name: '', active: true })
  const [editError, setEditError] = useState('')

  // Estado do formulário de reset de senha
  const [resetForm, setResetForm] = useState({ new_password: '', confirm_password: '' })
  const [resetError, setResetError] = useState('')

  const openCreate = () => {
    setCreateForm({ display_name: '', username: '', email: '', password: '', role: 'user' })
    setCreateError('')
    setModal({ type: 'create' })
  }

  const openEdit = (user: UserRecord) => {
    setEditForm({
      display_name: user.displayName,
      active: user.active,
    })
    setEditError('')
    setModal({ type: 'edit', user })
  }

  const openResetPassword = (user: UserRecord) => {
    setResetForm({ new_password: '', confirm_password: '' })
    setResetError('')
    setModal({ type: 'resetPassword', user })
  }

  const handleCreate = async () => {
    setCreateError('')
    const { display_name, username, email, password, role } = createForm
    if (!display_name.trim() || !username.trim() || !email.trim() || !password) {
      setCreateError('Preencha todos os campos.')
      return
    }
    if (password.length < 6) {
      setCreateError('Senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setCreateError('E-mail inválido.')
      return
    }

    setSubmitting(true)
    const result = await createUser({
      display_name: display_name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
      role,
    })
    setSubmitting(false)

    if (!result.success) {
      setCreateError(result.error ?? 'Erro ao criar usuário.')
      return
    }
    setModal(null)
    onToast('Usuário criado com sucesso!', 'sucesso')
  }

  const handleEdit = async () => {
    if (!modal || modal.type !== 'edit') return
    setEditError('')

    if (!editForm.display_name.trim()) {
      setEditError('Nome de exibição é obrigatório.')
      return
    }
    setSubmitting(true)
    const result = await updateUser(modal.user.userId, {
      display_name: editForm.display_name.trim(),
      active: editForm.active,
    })
    setSubmitting(false)

    if (!result.success) {
      setEditError(result.error ?? 'Erro ao atualizar usuário.')
      return
    }
    setModal(null)
    onToast('Usuário atualizado!', 'sucesso')
  }

  const handleResetPassword = async () => {
    if (!modal || modal.type !== 'resetPassword') return
    setResetError('')

    const { new_password, confirm_password } = resetForm
    if (!new_password || !confirm_password) {
      setResetError('Preencha todos os campos.')
      return
    }
    if (new_password !== confirm_password) {
      setResetError('As senhas não coincidem.')
      return
    }
    if (new_password.length < 6) {
      setResetError('Senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    const result = await resetPassword(modal.user.userId, new_password)
    setSubmitting(false)

    if (!result.success) {
      setResetError(result.error ?? 'Erro ao resetar senha.')
      return
    }
    setModal(null)
    onToast(`Senha de @${modal.user.username} redefinida!`, 'sucesso')
  }

  return (
    <div className="space-y-5">
      {/* Lista de usuários */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Usuários</h2>
            {!loading && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span>
            <span>Novo Usuário</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm animate-pulse">
            Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">E-mail</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Perfil</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {users.map(u => (
                  <tr
                    key={u.userId}
                    className={`transition-colors ${!u.active ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{u.displayName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">
                      @{u.username}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 hidden md:table-cell text-xs">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge active={u.active} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => openResetPassword(u)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 transition-colors"
                        >
                          Reset Senha
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Criar usuário */}
      {modal?.type === 'create' && (
        <ModalOverlay title="Novo Usuário" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nome de exibição</label>
                <input
                  type="text"
                  value={createForm.display_name}
                  onChange={e => setCreateForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={e => setCreateForm(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                  placeholder="Ex: joao"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">E-mail</label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Ex: joao@exemplo.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Senha inicial</label>
              <input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Perfil</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as 'admin' | 'user' }))}
                className={inputClass}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {createError && (
              <p className="text-xs text-red-600 dark:text-red-400">✕ {createError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors shadow-sm"
              >
                {submitting ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: Editar usuário */}
      {modal?.type === 'edit' && (
        <ModalOverlay title={`Editar — @${modal.user.username}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nome de exibição</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))}
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between py-3 px-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta ativa</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Usuários inativos não conseguem fazer login</p>
              </div>
              <Toggle value={editForm.active} onChange={v => setEditForm(p => ({ ...p, active: v }))} />
            </div>

            {editError && (
              <p className="text-xs text-red-600 dark:text-red-400">✕ {editError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors shadow-sm"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: Resetar senha */}
      {modal?.type === 'resetPassword' && (
        <ModalOverlay title={`Redefinir senha — @${modal.user.username}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Defina uma nova senha para{' '}
              <strong className="text-gray-700 dark:text-gray-300">{modal.user.displayName}</strong>.
              O usuário verá um aviso para alterá-la no próximo acesso.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nova senha</label>
              <input
                type="password"
                value={resetForm.new_password}
                onChange={e => setResetForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
                className={inputClass}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={resetForm.confirm_password}
                onChange={e => setResetForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Repita a senha"
                className={inputClass}
              />
            </div>

            {resetError && (
              <p className="text-xs text-red-600 dark:text-red-400">✕ {resetError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-colors shadow-sm"
              >
                {submitting ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
