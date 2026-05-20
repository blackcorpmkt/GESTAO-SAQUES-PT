import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function UserMenu() {
  const { currentUser, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!currentUser) return null

  const initials = currentUser.displayName
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || currentUser.username.slice(0, 2).toUpperCase()

  const roleLabel = currentUser.role === 'admin' ? 'Administrador' : 'Usuário'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[96px] truncate">
          {currentUser.displayName}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-fade-in">
          {/* Info do usuário */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  @{currentUser.username} · {roleLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="py-1">
            <button
              onClick={() => { logout(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5"
            >
              <span className="text-base leading-none">↩</span>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
