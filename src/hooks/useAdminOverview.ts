import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface AdminUserRow {
  userId: string
  displayName: string
  username: string
  pendingEur: number
  pendingBrl: number
  receivedEur: number
  receivedBrl: number
  count: number
}

export interface AdminTotals {
  pendingEur: number
  pendingBrl: number
  receivedEur: number
  receivedBrl: number
  launches: number
  users: number
}

// Depende das políticas RLS de admin já existentes no Supabase
// (SELECT em users e launches liberado para admin). Não cria nada novo no banco.
export function useAdminOverview(onError?: (msg: string) => void) {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setLoading(true)
      const [usersRes, launchesRes] = await Promise.all([
        supabase.from('users').select('id, username, display_name'),
        supabase.from('launches').select('user_id, net_value_eur, net_value_brl, status'),
      ])
      if (cancelado) return
      if (usersRes.error || launchesRes.error) {
        onError?.('Erro ao carregar painel admin')
        setLoading(false)
        return
      }

      const byUser = new Map<string, AdminUserRow>()
      for (const u of usersRes.data ?? []) {
        byUser.set(u.id as string, {
          userId: u.id as string,
          displayName: (u.display_name as string) || (u.username as string),
          username: u.username as string,
          pendingEur: 0, pendingBrl: 0, receivedEur: 0, receivedBrl: 0, count: 0,
        })
      }
      for (const l of launchesRes.data ?? []) {
        const row = byUser.get(l.user_id as string)
        if (!row) continue
        row.count++
        if (l.status === 'received') {
          row.receivedEur += Number(l.net_value_eur)
          row.receivedBrl += Number(l.net_value_brl)
        } else {
          row.pendingEur += Number(l.net_value_eur)
          row.pendingBrl += Number(l.net_value_brl)
        }
      }
      setRows([...byUser.values()])
      setLoading(false)
    })()
    return () => { cancelado = true }
  }, [])

  const totals: AdminTotals = rows.reduce(
    (acc, r) => ({
      pendingEur: acc.pendingEur + r.pendingEur,
      pendingBrl: acc.pendingBrl + r.pendingBrl,
      receivedEur: acc.receivedEur + r.receivedEur,
      receivedBrl: acc.receivedBrl + r.receivedBrl,
      launches: acc.launches + r.count,
      users: acc.users + 1,
    }),
    { pendingEur: 0, pendingBrl: 0, receivedEur: 0, receivedBrl: 0, launches: 0, users: 0 },
  )

  return { rows, totals, loading }
}
