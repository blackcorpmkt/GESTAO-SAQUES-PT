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

function mapRow(row: Record<string, unknown>): UserRecord {
  return {
    userId: row.id as string,
    username: row.username as string,
    email: row.email as string,
    displayName: row.display_name as string,
    role: row.role as 'admin' | 'user',
    percentage: Number(row.percentage),
    passwordChanged: Boolean(row.password_changed),
    active: Boolean(row.active),
  }
}

export function useUsers(onError?: (msg: string) => void) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      onError?.('Erro ao carregar usuários')
    } else {
      setUsers(data?.map(mapRow) ?? [])
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
