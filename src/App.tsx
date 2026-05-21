import { useCallback, useMemo } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { LancamentoForm } from './components/LancamentoForm'
import { LancamentosTable } from './components/LancamentosTable'
import { CalculadoraLucro } from './components/CalculadoraLucro'
import { Relatorio } from './components/Relatorio'
import { Configuracoes } from './components/Configuracoes'
import { GerenciamentoUsuarios } from './components/GerenciamentoUsuarios'
import { ToastContainer } from './components/Toast'
import { UserMenu } from './components/UserMenu'
import { useLancamentos } from './hooks/useLancamentos'
import { useConfig } from './hooks/useConfig'
import { useToast } from './hooks/useToast'
import { useDarkMode } from './hooks/useDarkMode'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 animate-pulse shadow-lg">
          GS
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">Carregando...</p>
      </div>
    </div>
  )
}

function AppContent({ userId }: { userId: string }) {
  const { currentUser } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const { darkMode, toggleDarkMode } = useDarkMode()

  // Callback estável para erros dos hooks — passa addToast sem criar função nova a cada render
  const handleError = useCallback((msg: string) => addToast(msg, 'erro'), [addToast])

  const { config, updateConfig, resetConfig } = useConfig(userId, handleError)
  const { lancamentos, addLancamento, toggleStatus, deleteLancamento, importLancamentos, updateCotacao, applyCotacaoToPending } = useLancamentos(userId, handleError)

  const ABAS = useMemo(() => {
    const base: { to: string; label: string; icon: string }[] = [
      { to: '/dashboard',     label: 'Dashboard',    icon: '◈' },
      { to: '/lancamentos',   label: 'Lançamentos',  icon: '≡' },
      { to: '/calculadora',   label: 'Calculadora',  icon: '🧮' },
      { to: '/relatorio',     label: 'Relatório',    icon: '📄' },
      { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
    ]
    if (currentUser?.role === 'admin') {
      base.push({ to: '/usuarios', label: 'Usuários', icon: '👥' })
    }
    return base
  }, [currentUser?.role])

  const cotacao = config.cotacao_manual

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
                GS
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-900 dark:text-white text-sm">Gestão de Saques</span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">Portugal</span>
              </div>
            </div>

            {/* Navegação */}
            <nav className="flex gap-0.5">
              {ABAS.map(a => (
                <NavLink
                  key={a.to}
                  to={a.to}
                  className={({ isActive }) => `
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{a.label}</span>
                  <span className="sm:hidden">{a.icon}</span>
                </NavLink>
              ))}
            </nav>

            {/* Ações à direita */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                title={darkMode ? 'Modo claro' : 'Modo escuro'}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all duration-150 text-base flex-shrink-0"
              >
                {darkMode ? '☀' : '☾'}
              </button>
              <UserMenu onToast={addToast} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Routes>
          <Route
            path="dashboard"
            element={
              <>
                <Dashboard
                  lancamentos={lancamentos}
                  config={config}
                  onUpdateConfig={updateConfig}
                />
                <LancamentoForm
                  cotacao={cotacao}
                  taxaGateway={config.taxa_gateway}
                  taxaFixaEur={config.taxa_fixa_eur}
                  onAdd={addLancamento}
                  onToast={addToast}
                />
              </>
            }
          />

          <Route
            path="lancamentos"
            element={
              <>
                <LancamentoForm
                  cotacao={cotacao}
                  taxaGateway={config.taxa_gateway}
                  taxaFixaEur={config.taxa_fixa_eur}
                  onAdd={addLancamento}
                  onToast={addToast}
                />
                <LancamentosTable
                  lancamentos={lancamentos}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteLancamento}
                  onUpdateCotacao={updateCotacao}
                  onToast={addToast}
                />
              </>
            }
          />

          <Route
            path="calculadora"
            element={<CalculadoraLucro config={config} onToast={addToast} />}
          />

          <Route
            path="relatorio"
            element={
              <>
                <LancamentosTable
                  lancamentos={lancamentos}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteLancamento}
                  onUpdateCotacao={updateCotacao}
                  onToast={addToast}
                />
                <Relatorio
                  lancamentos={lancamentos}
                  nomeRelatorio={config.nome_relatorio}
                  onToast={addToast}
                />
              </>
            }
          />

          <Route
            path="configuracoes"
            element={
              <Configuracoes
                config={config}
                onUpdateConfig={updateConfig}
                onResetConfig={resetConfig}
                lancamentos={lancamentos}
                onImport={importLancamentos}
                onApplyCotacaoPendentes={applyCotacaoToPending}
                onToast={addToast}
              />
            }
          />

          <Route
            path="usuarios"
            element={
              currentUser?.role === 'admin'
                ? <GerenciamentoUsuarios onToast={addToast} />
                : <Navigate to="/dashboard" replace />
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function App() {
  const { isAuthenticated, currentUser, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated && currentUser
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />
      {/* key={userId} garante remontagem completa ao trocar de conta */}
      <Route
        path="/*"
        element={
          isAuthenticated && currentUser
            ? <AppContent key={currentUser.userId} userId={currentUser.userId} />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}
