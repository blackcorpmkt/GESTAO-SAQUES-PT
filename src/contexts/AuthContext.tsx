import { createContext, useContext, useState, useCallback } from 'react'
import { Session } from '../types/auth'
import { authLogin, authLogout, getSession, ensureAdminUser } from '../utils/authStorage'

interface AuthContextValue {
  currentUser: Session | null
  isAuthenticated: boolean
  login: (username: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Session | null>(() => {
    ensureAdminUser()
    return getSession()
  })

  const login = useCallback((username: string, password: string) => {
    const result = authLogin(username, password)
    if (result.success) {
      setCurrentUser(result.session)
      return { success: true }
    }
    return { success: false, error: result.error }
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setCurrentUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: currentUser !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
