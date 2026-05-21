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
import { BrandMark } from './BrandMark'

interface Props {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onEditProfile: () => void
}

type Group = 'Operação' | 'Gestão' | 'Sistema'

interface Item {
  to: string
  label: string
  Icon: LucideIcon
  group: Group
  adminOnly?: boolean // visível só para admin
  userOnly?: boolean // visível só para usuário comum (admin não opera lançamentos)
}

const ITEMS: Item[] = [
  { to: '/dashboard', label: 'Painel', Icon: LayoutDashboard, group: 'Operação' },
  { to: '/lancamentos', label: 'Lançamentos', Icon: ListOrdered, group: 'Operação', userOnly: true },
  { to: '/divisao-lucro', label: 'Divisão de Lucro', Icon: PieChart, group: 'Operação', userOnly: true },
  { to: '/relatorio', label: 'Relatório', Icon: FileText, group: 'Operação', userOnly: true },
  { to: '/socios', label: 'Sócios', Icon: Handshake, group: 'Gestão', userOnly: true },
  { to: '/usuarios', label: 'Usuários', Icon: Users, group: 'Gestão', adminOnly: true },
  { to: '/admin', label: 'Admin', Icon: ShieldCheck, group: 'Gestão', adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', Icon: Settings, group: 'Sistema' },
]

const GROUP_ORDER: Group[] = ['Operação', 'Gestão', 'Sistema']

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
        <div onClick={onCloseMobile} className="fixed inset-0 bg-slate-900/60 z-40 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 w-60
          border-r border-slate-950/60
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Topo: marca */}
        <div className={`flex items-center gap-2.5 h-16 flex-shrink-0 ${collapsed ? 'md:justify-center md:px-0' : ''} px-4`}>
          <BrandMark size={32} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-white text-[16px] tracking-[-0.01em] truncate leading-tight">
                SaqueFlow
              </p>
              <p className="text-[11px] text-slate-500">Portugal · EUR</p>
            </div>
          )}
          <button onClick={onCloseMobile} className="md:hidden ml-auto text-slate-400 hover:text-white" title="Fechar menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação agrupada */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {GROUP_ORDER.map(group => {
            const groupItems = items.filter(i => i.group === group)
            if (groupItems.length === 0) return null
            return (
              <div key={group} className="pt-2 first:pt-0">
                {!collapsed && (
                  <p className="px-3 pt-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                    {group}
                  </p>
                )}
                {groupItems.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onCloseMobile}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors
                      ${collapsed ? 'md:justify-center' : ''}
                      ${isActive
                        ? 'bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[2px] before:rounded-r before:bg-blue-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0 opacity-90" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Recolher (desktop) */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="hidden md:flex items-center justify-center gap-2 mx-3 mb-2 py-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
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
          <div className={`flex items-center gap-2.5 rounded-lg ${collapsed ? 'md:justify-center' : 'px-1 py-1'}`}>
            <button
              onClick={onEditProfile}
              title="Editar perfil"
              className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-[12.5px] shadow hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
            {!collapsed && (
              <>
                <button onClick={onEditProfile} title="Editar perfil" className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-medium text-slate-200 truncate">{currentUser.displayName}</p>
                  <p className="text-[11.5px] text-slate-500 truncate">
                    @{currentUser.username} · {currentUser.role === 'admin' ? 'Administrador' : 'Sócio'}
                  </p>
                </button>
                <button
                  onClick={() => logout()}
                  title="Sair da conta"
                  className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => logout()}
              title="Sair da conta"
              className="hidden md:flex w-full items-center justify-center mt-2 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
