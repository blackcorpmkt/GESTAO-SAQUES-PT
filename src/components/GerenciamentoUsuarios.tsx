import { useState, useCallback } from 'react'
import { Plus, X, Users, Pencil, KeyRound } from 'lucide-react'
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

const inputClass = 'sf-input'

function ModalOverlay({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="sf-modal-overlay">
      <div className="sf-modal max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="sf-card-title">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'user' }) {
  return role === 'admin'
    ? <span className="sf-badge sf-badge-info">Admin</span>
    : <span className="sf-badge sf-badge-neutral">Usuário</span>
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="sf-badge sf-badge-success">Ativo</span>
    : <span className="sf-badge sf-badge-danger">Inativo</span>
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
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
    <div className="space-y-6">
      {/* Lista de usuários */}
      <div className="sf-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="sf-card-title">Usuários</h2>
            {!loading && (
              <p className="sf-card-sub">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={openCreate} className="sf-btn-primary">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm animate-pulse">
            Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-9 h-9 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Username</th>
                  <th className="hidden md:table-cell">E-mail</th>
                  <th className="!text-center">Perfil</th>
                  <th className="!text-center">Status</th>
                  <th className="!text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId} className={!u.active ? 'opacity-50' : ''}>
                    <td>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{u.displayName}</p>
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">@{u.username}</td>
                    <td className="text-slate-400 dark:text-slate-500 hidden md:table-cell text-xs font-mono">{u.email}</td>
                    <td className="text-center"><RoleBadge role={u.role} /></td>
                    <td className="text-center"><StatusBadge active={u.active} /></td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(u)} className="sf-btn px-3 py-1.5 text-xs">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => openResetPassword(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset Senha
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
                <label className="sf-label">Nome de exibição</label>
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
                <label className="sf-label">Username</label>
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
              <label className="sf-label">E-mail</label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Ex: joao@exemplo.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="sf-label">Senha inicial</label>
              <input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mín. 6 caracteres"
                className={inputClass}
              />
            </div>

            <div>
              <label className="sf-label">Perfil</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as 'admin' | 'user' }))}
                className={`${inputClass} w-full`}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {createError && <p className="text-xs text-red-600 dark:text-red-400">✕ {createError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="sf-btn flex-1 py-2.5">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={submitting} className="sf-btn-primary flex-1 py-2.5">
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
              <label className="sf-label">Nome de exibição</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))}
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between py-3 px-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Conta ativa</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Usuários inativos não conseguem fazer login</p>
              </div>
              <Toggle value={editForm.active} onChange={v => setEditForm(p => ({ ...p, active: v }))} />
            </div>

            {editError && <p className="text-xs text-red-600 dark:text-red-400">✕ {editError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="sf-btn flex-1 py-2.5">
                Cancelar
              </button>
              <button onClick={handleEdit} disabled={submitting} className="sf-btn-primary flex-1 py-2.5">
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Defina uma nova senha para{' '}
              <strong className="text-slate-700 dark:text-slate-300">{modal.user.displayName}</strong>.
              O usuário verá um aviso para alterá-la no próximo acesso.
            </p>

            <div>
              <label className="sf-label">Nova senha</label>
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
              <label className="sf-label">Confirmar nova senha</label>
              <input
                type="password"
                value={resetForm.confirm_password}
                onChange={e => setResetForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Repita a senha"
                className={inputClass}
              />
            </div>

            {resetError && <p className="text-xs text-red-600 dark:text-red-400">✕ {resetError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="sf-btn flex-1 py-2.5">
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={submitting}
                className="flex-1 py-2.5 inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold border border-transparent bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors disabled:opacity-50"
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
