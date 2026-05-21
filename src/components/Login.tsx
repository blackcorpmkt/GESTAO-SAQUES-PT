import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BrandMark } from './BrandMark'

type Mode = 'login' | 'signup'

const inputClass = 'sf-input'
const labelClass = 'sf-label'

const USERNAME_RE = /^[a-zA-Z0-9_]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const { login, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Campos de login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Campos de cadastro
  const [displayName, setDisplayName] = useState('')
  const [suUsername, setSuUsername] = useState('')
  const [email, setEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setLoading(false)
    setShowPass(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    const result = await login(username, password)
    if (!result.success) {
      setError(result.error ?? 'Falha na autenticação')
      setLoading(false)
    }
    // Se success, onAuthStateChange atualiza currentUser e o App renderiza AppContent
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const nome = displayName.trim()
    const user = suUsername.trim().toLowerCase()
    const mail = email.trim().toLowerCase()

    if (!nome) { setError('Informe o nome completo.'); return }
    if (!user) { setError('Informe o nome de usuário.'); return }
    if (!USERNAME_RE.test(user)) { setError('Usuário: apenas letras, números e underscore, sem espaços.'); return }
    if (!EMAIL_RE.test(mail)) { setError('Email inválido.'); return }
    if (suPassword.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    if (suPassword !== confirmPassword) { setError('As senhas não conferem.'); return }

    setLoading(true)
    const result = await signUp({ displayName: nome, username: user, email: mail, password: suPassword })
    if (!result.success) {
      setError(result.error ?? 'Erro ao criar conta.')
      setLoading(false)
    }
    // Se success, signInWithPassword abre a sessão → App redireciona para /dashboard
  }

  const ErrorBox = () =>
    error ? (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / marca */}
        <div className="flex flex-col items-center text-center mb-8">
          <BrandMark size={60} className="mb-4 shadow-xl" />
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white tracking-[-0.02em]">SaqueFlow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login' ? 'Portugal · EUR · Acesso restrito' : 'Portugal · EUR · Criar nova conta'}
          </p>
        </div>

        {/* Card */}
        <div className="sf-card shadow-pop p-8">
          {mode === 'login' ? (
            <div key="login" className="animate-slide-in">
              <h2 className="sf-card-title mb-6">Entrar na sua conta</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>Usuário</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    autoFocus
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPass ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <ErrorBox />

                <button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="sf-btn-primary w-full py-2.5 mt-2"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Criar conta
                </button>
              </p>
            </div>
          ) : (
            <div key="signup" className="animate-slide-in">
              <h2 className="sf-card-title mb-6">Criar sua conta</h2>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className={labelClass}>Nome completo</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                    autoFocus
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Nome de usuário</label>
                  <input
                    type="text"
                    value={suUsername}
                    onChange={e => setSuUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    placeholder="ex: joao_silva"
                    autoComplete="username"
                    className={inputClass}
                  />
                  <p className="sf-hint">Apenas letras, números e underscore.</p>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={suPassword}
                      onChange={e => setSuPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPass ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirmar senha</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>

                <ErrorBox />

                <button type="submit" disabled={loading} className="sf-btn-primary w-full py-2.5 mt-2">
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Já tenho conta? Entrar
                </button>
              </p>
            </div>
          )}
        </div>

        {mode === 'login' && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Sem acesso? Crie sua conta ou fale com o administrador.
          </p>
        )}
      </div>
    </div>
  )
}
