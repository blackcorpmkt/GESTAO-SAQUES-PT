import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UserRecord } from '../types/auth'

export interface CreateUserData {
  email: string
  password: string
  username: string
  display_name: string
  role: 'admin' | 'user'
  percentage?: number
}

export interface UpdateUserData {
  display_name?: string
  percentage?: number
  active?: boolean
}

// Tolerante à origem: a tabela users traz percentage/password_changed, mas a RPC
// get_all_users_for_admin não — defaults evitam NaN e mantêm o tipo UserRecord.
function mapRow(row: Record<string, unknown>): UserRecord {
  return {
    userId: row.id as string,
    username: row.username as string,
    email: row.email as string,
    displayName: row.display_name as string,
    role: row.role as 'admin' | 'user',
    percentage: Number(row.percentage ?? 0),
    passwordChanged: Boolean(row.password_changed ?? false),
    active: Boolean(row.active),
  }
}

export function useUsers(onError?: (msg: string) => void) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Lista TODOS os usuários via RPC (SECURITY DEFINER). A RLS restringe a tabela
  // users ao próprio perfil, então a query direta não trazia os usuários criados
  // pelo cadastro público. Mesma fonte usada pelo painel admin.
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_users_for_admin')
    if (error) {
      onError?.('Erro ao carregar usuários')
    } else {
      const raw = (data ?? []) as Record<string, unknown>[]
      // created_at asc para manter a ordem estável de antes
      raw.sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
      setUsers(raw.map(mapRow))
    }
    setLoading(false)
  }, [onError])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const createUser = useCallback(async (data: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    const { data: result, error } = await supabase.functions.invoke('create-user', { body: data })
    if (error || result?.error) {
      return { success: false, error: result?.error ?? 'Erro ao criar usuário. Verifique os dados.' }
    }
    await fetchUsers()
    return { success: true }
  }, [fetchUsers])

  const updateUser = useCallback(async (userId: string, updates: UpdateUserData): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('users').update(updates).eq('id', userId)
    if (error) return { success: false, error: 'Erro ao atualizar usuário.' }
    await fetchUsers()
    return { success: true }
  }, [fetchUsers])

  const resetPassword = useCallback(async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const { data: result, error } = await supabase.functions.invoke('reset-user-password', {
      body: { user_id: userId, new_password: newPassword },
    })
    if (error || result?.error) {
      return { success: false, error: result?.error ?? 'Erro ao resetar senha.' }
    }
    return { success: true }
  }, [])

  return { users, loading, createUser, updateUser, resetPassword, refreshUsers: fetchUsers }
}
