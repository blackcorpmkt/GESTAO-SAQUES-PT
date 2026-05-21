import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListOrdered,
  PieChart,
  FileText,
  Handshake,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onEditProfile: () => void
}

interface Item {
  to: string
  label: string
  Icon: LucideIcon
  adminOnly?: boolean  // visível só para admin
  userOnly?: boolean   // visível só para usuário comum (admin não opera lançamentos)
}

const ITEMS: Item[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', Icon: ListOrdered, userOnly: true },
  { to: '/divisao-lucro', label: 'Divisão de Lucro', Icon: PieChart, userOnly: true },
  { to: '/relatorio', label: 'Relatório', Icon: FileText, userOnly: true },
  { to: '/socios', label: 'Sócios', Icon: Handshake, userOnly: true },
  { to: '/usuarios', label: 'Usuários', Icon: Users, adminOnly: true },
  { to: '/admin', label: 'Admin', Icon: ShieldCheck, adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', Icon: Settings },
]

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onEditProfile }: Props) {
  const { currentUser, logout } = useAuth()
  if (!currentUser) return null

  const initials =
    currentUser.displayName
      .split(' ')
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || currentUser.username.slice(0, 2).toUpperCase()

  const isAdmin = currentUser.role === 'admin'
  const items = ITEMS.filter(i => {
    if (i.adminOnly) return isAdmin
    if (i.userOnly) return !isAdmin
    return true
  })

  return (
    <>
      {/* Backdrop (mobile) */}
      {mobileOpen && (
        <div onClick={onCloseMobile} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-400 transition-all duration-200 w-60
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Topo: logo */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-800 flex-shrink-0">
          <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow">
            GS
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-sm truncate leading-tight">Gestão de Saques</p>
              <p className="text-[11px] text-slate-500">Portugal</p>
            </div>
          )}
          <button onClick={onCloseMobile} className="md:hidden ml-auto text-slate-400 hover:text-white" title="Fechar menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${collapsed ? 'md:justify-center' : ''}
                ${isActive
                  ? 'bg-slate-800 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Recolher (desktop) */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="hidden md:flex items-center justify-center gap-2 mx-2 mb-2 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Recolher</span>
            </>
          )}
        </button>

        {/* Rodapé: usuário */}
        <div className="border-t border-slate-800 p-3 flex-shrink-0">
          <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}>
            <button
              onClick={onEditProfile}
              title="Editar perfil"
              className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{currentUser.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    @{currentUser.username} · {currentUser.role === 'admin' ? 'Admin' : 'Usuário'}
                  </p>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sair da conta"
                  className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => logout()}
              title="Sair da conta"
              className="hidden md:flex w-full items-center justify-center mt-2 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
