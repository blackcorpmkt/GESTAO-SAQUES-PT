import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { UserProfile } from '../types/auth'

// Se a inicialização travar (ex.: sessão não restaurada / fetch do perfil pendurado),
// libera a UI após este tempo para cair no /login em vez de loading eterno.
const AUTH_INIT_TIMEOUT_MS = 8000

interface SignUpInput {
  displayName: string
  username: string
  email: string
  password: string
}

interface AuthContextValue {
  currentUser: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (input: SignUpInput) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('username, email, display_name, role, percentage, password_changed')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    userId,
    username: data.username,
    email: data.email,
    displayName: data.display_name,
    role: data.role as 'admin' | 'user',
    percentage: data.percentage,
    passwordChanged: data.password_changed,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false

    // Timeout de segurança: se a inicialização não concluir, libera o loading.
    // Com currentUser nulo, o App redireciona para /login (sem travar em "Carregando...").
    const safety = setTimeout(() => {
      if (!cancelado) setLoading(false)
    }, AUTH_INIT_TIMEOUT_MS)

    const finalizar = () => {
      if (cancelado) return
      clearTimeout(safety)
      setLoading(false)
    }

    // Resolve a sessão (restaurada ou recém-criada) buscando o perfil correspondente.
    // Se o perfil não existir / falhar, encerra a sessão em vez de ficar em loading eterno.
    const aplicarSessao = async (session: Session | null) => {
      if (cancelado) return
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (cancelado) return
        if (profile) {
          setCurrentUser(profile)
        } else {
          await supabase.auth.signOut()
          if (cancelado) return
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
      finalizar()
    }

    // INITIAL_SESSION cobre a restauração de sessão ao carregar (substitui getSession,
    // evitando a corrida em que o perfil era buscado antes da sessão estar pronta).
    // SIGNED_IN cobre login/cadastro; SIGNED_OUT cobre logout.
    // TOKEN_REFRESHED/USER_UPDATED são ignorados de propósito: não devem disparar
    // signOut em falha transitória de fetch (deslogaria o usuário no refresh do token).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (cancelado) return
        setCurrentUser(null)
        finalizar()
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        aplicarSessao(session)
      }
    })

    return () => {
      cancelado = true
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    // Resolve username → email via função SECURITY DEFINER (sem precisar estar autenticado)
    const { data: email, error: fnError } = await supabase.rpc('get_email_by_username', {
      p_username: username.trim(),
    })

    if (fnError || !email) {
      return { success: false, error: 'Usuário não encontrado.' }
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('invalid') || msg.includes('credentials')) {
        return { success: false, error: 'Senha incorreta.' }
      }
      return { success: false, error: 'Falha na autenticação. Tente novamente.' }
    }

    return { success: true }
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<{ success: boolean; error?: string }> => {
    const email = input.email.trim().toLowerCase()
    const password = input.password

    // Cria conta via Edge Function (service role): cria no Auth + grava perfil/configurações.
    // role é forçada para 'user' no servidor — cadastro público nunca cria admin.
    const { data, error } = await supabase.functions.invoke('public-signup', {
      body: {
        display_name: input.displayName.trim(),
        username: input.username.trim().toLowerCase(),
        email,
        password,
      },
    })

    if (error) {
      // Mensagem específica vem no corpo da resposta de erro da função
      let msg = 'Erro ao criar conta. Tente novamente.'
      try {
        const ctx = (error as { context?: Response }).context
        const b = ctx && typeof ctx.json === 'function' ? await ctx.json() : null
        if (b?.error) msg = b.error
      } catch { /* mantém mensagem genérica */ }
      return { success: false, error: msg }
    }
    if (!data?.success) {
      return { success: false, error: data?.error ?? 'Erro ao criar conta.' }
    }

    // Conta criada → autentica para abrir a sessão e cair no /dashboard
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      return { success: false, error: 'Conta criada! Faça login para entrar.' }
    }

    return { success: true }
  }, [])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignora falha de rede no signOut — limpamos o cache local de qualquer forma
    }
    setCurrentUser(null)
    // Limpeza defensiva: remove tokens do Supabase (sb-*) que possam ter ficado em cache,
    // garantindo que não sobre sessão parcial. Preserva preferências de UI (tema, sidebar).
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k))
    } catch {
      // localStorage indisponível (ex.: modo privado) — nada a limpar
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = await fetchProfile(user.id)
    if (profile) setCurrentUser(profile)
  }, [])

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      isAuthenticated: currentUser !== null,
      login,
      signUp,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
