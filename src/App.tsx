import { useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Menu, Sun, Moon } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { LancamentoForm } from './components/LancamentoForm'
import { LancamentosTable } from './components/LancamentosTable'
import { DivisaoLucro } from './components/DivisaoLucro'
import { Socios } from './components/Socios'
import { AdminPanel } from './components/AdminPanel'
import { Relatorio } from './components/Relatorio'
import { Configuracoes } from './components/Configuracoes'
import { GerenciamentoUsuarios } from './components/GerenciamentoUsuarios'
import { EditarPerfil } from './components/EditarPerfil'
import { ToastContainer } from './components/Toast'
import { useLancamentos } from './hooks/useLancamentos'
import { useConfig } from './hooks/useConfig'
import { usePartners } from './hooks/usePartners'
import { useLaunchCosts } from './hooks/useLaunchCosts'
import { useToast } from './hooks/useToast'
import { useDarkMode } from './hooks/useDarkMode'

const COLLAPSE_KEY = 'gestao_saques:sidebar_collapsed'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/lancamentos': 'Lançamentos',
  '/divisao-lucro': 'Divisão de Lucro',
  '/relatorio': 'Relatório',
  '/socios': 'Sócios',
  '/usuarios': 'Usuários',
  '/admin': 'Admin',
  '/configuracoes': 'Configurações',
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 animate-pulse shadow-lg">
          GS
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500">Carregando...</p>
      </div>
    </div>
  )
}

function AppContent({ userId }: { userId: string }) {
  const { currentUser } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  const toggleCollapse = useCallback(() => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(COLLAPSE_KEY, String(next))
      return next
    })
  }, [])

  // Callback estável para erros dos hooks
  const handleError = useCallback((msg: string) => addToast(msg, 'erro'), [addToast])

  const { config, updateConfig, resetConfig } = useConfig(userId, handleError)
  const { lancamentos, addLancamento, toggleStatus, deleteLancamento, importLancamentos, updateCotacao, applyCotacaoToPending } = useLancamentos(userId, handleError)
  const { partners, loading: partnersLoading, addPartner, updatePartner } = usePartners(userId, handleError)
  const { costs, addCost, removeCost } = useLaunchCosts(userId, handleError)

  const cotacao = config.cotacao_manual
  const pageTitle = TITLES[location.pathname] ?? 'Dashboard'
  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onEditProfile={() => setEditProfileOpen(true)}
      />

      <div className={`transition-all duration-200 ${collapsed ? 'md:pl-16' : 'md:pl-60'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-slate-800/85 backdrop-blur border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white flex-1 truncate">{pageTitle}</h1>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors flex-shrink-0"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
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
                  {/* Admin não faz lançamentos */}
                  {!isAdmin && (
                    <LancamentoForm
                      cotacao={cotacao}
                      taxaGateway={config.taxa_gateway}
                      taxaFixaEur={config.taxa_fixa_eur}
                      onAdd={addLancamento}
                      onToast={addToast}
                    />
                  )}
                </>
              }
            />

            <Route
              path="lancamentos"
              element={
                isAdmin ? <Navigate to="/dashboard" replace /> : (
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
                )
              }
            />

            <Route
              path="divisao-lucro"
              element={
                isAdmin ? <Navigate to="/dashboard" replace /> : (
                  <DivisaoLucro
                    lancamentos={lancamentos}
                    partners={partners}
                    costs={costs}
                    cotacao={cotacao}
                    onAddCost={addCost}
                    onRemoveCost={removeCost}
                    onToast={addToast}
                  />
                )
              }
            />

            <Route
              path="socios"
              element={
                isAdmin ? <Navigate to="/dashboard" replace /> : (
                  <Socios
                    partners={partners}
                    loading={partnersLoading}
                    onAdd={addPartner}
                    onUpdate={updatePartner}
                    onToast={addToast}
                  />
                )
              }
            />

            <Route
              path="relatorio"
              element={
                isAdmin ? <Navigate to="/dashboard" replace /> : (
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
                )
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

            <Route
              path="admin"
              element={
                currentUser?.role === 'admin'
                  ? <AdminPanel onToast={addToast} />
                  : <Navigate to="/dashboard" replace />
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <EditarPerfil isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} onToast={addToast} />
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
