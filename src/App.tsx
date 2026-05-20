import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { LancamentoForm } from './components/LancamentoForm'
import { LancamentosTable } from './components/LancamentosTable'
import { Relatorio } from './components/Relatorio'
import { Configuracoes } from './components/Configuracoes'
import { ToastContainer } from './components/Toast'
import { UserMenu } from './components/UserMenu'
import { useLancamentos } from './hooks/useLancamentos'
import { useConfig } from './hooks/useConfig'
import { useToast } from './hooks/useToast'
import { useDarkMode } from './hooks/useDarkMode'

type Aba = 'dashboard' | 'lancamentos' | 'relatorio' | 'configuracoes'

const ABAS: { key: Aba; label: string; icon: string }[] = [
  { key: 'dashboard',     label: 'Dashboard',    icon: '◈' },
  { key: 'lancamentos',   label: 'Lançamentos',  icon: '≡' },
  { key: 'relatorio',     label: 'Relatório',    icon: '📄' },
  { key: 'configuracoes', label: 'Configurações', icon: '⚙' },
]

// AppContent é separado para que os hooks sempre sejam chamados
// (nunca condicionalmente), recebendo o userId do contexto
function AppContent({ userId }: { userId: string }) {
  const [aba, setAba] = useState<Aba>('dashboard')
  const { config, updateConfig, resetConfig } = useConfig(userId)
  const { lancamentos, addLancamento, toggleStatus, deleteLancamento, importLancamentos } = useLancamentos(userId)
  const { toasts, addToast, removeToast } = useToast()
  const { darkMode, toggleDarkMode } = useDarkMode()

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
                <button
                  key={a.key}
                  onClick={() => setAba(a.key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${aba === a.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{a.label}</span>
                  <span className="sm:hidden">{a.icon}</span>
                </button>
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
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {aba === 'dashboard' && (
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
        )}

        {aba === 'lancamentos' && (
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
              onToast={addToast}
            />
          </>
        )}

        {aba === 'relatorio' && (
          <>
            <LancamentosTable
              lancamentos={lancamentos}
              onToggleStatus={toggleStatus}
              onDelete={deleteLancamento}
              onToast={addToast}
            />
            <Relatorio
              lancamentos={lancamentos}
              nomeRelatorio={config.nome_relatorio}
              onToast={addToast}
            />
          </>
        )}

        {aba === 'configuracoes' && (
          <Configuracoes
            config={config}
            onUpdateConfig={updateConfig}
            onResetConfig={resetConfig}
            lancamentos={lancamentos}
            onImport={importLancamentos}
            onToast={addToast}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function App() {
  const { isAuthenticated, currentUser } = useAuth()

  if (!isAuthenticated || !currentUser) {
    return <Login />
  }

  // key={userId} garante que o AppContent é remontado ao trocar de conta
  return <AppContent key={currentUser.userId} userId={currentUser.userId} />
}
