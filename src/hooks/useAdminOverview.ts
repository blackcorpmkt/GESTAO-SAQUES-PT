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

// O admin lê via RPC (funções SECURITY DEFINER já existentes no Supabase), porque a
// RLS restringe cada usuário ao próprio perfil/lançamentos — queries diretas só
// devolveriam os dados do próprio admin. Não cria nem altera nada no banco.
//   • get_all_users_for_admin(): lista TODOS os usuários (inclui recém-cadastrados
//     pela tela pública, mesmo sem lançamentos).
//   • get_admin_overview(): resumo financeiro agregado por usuário.
export function useAdminOverview(onError?: (msg: string) => void) {
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setLoading(true)
      const [usersRes, overviewRes] = await Promise.all([
        supabase.rpc('get_all_users_for_admin'),
        supabase.rpc('get_admin_overview'),
      ])
      if (cancelado) return
      if (usersRes.error || overviewRes.error) {
        onError?.('Erro ao carregar painel admin')
        setLoading(false)
        return
      }

      const byUser = new Map<string, AdminUserRow>()

      // 1) Semeia com a lista completa de usuários, zerando o financeiro. Garante que
      //    contas sem lançamentos também apareçam na tabela.
      for (const u of (usersRes.data ?? []) as Record<string, unknown>[]) {
        const id = u.id as string
        byUser.set(id, {
          userId: id,
          displayName: (u.display_name as string) || (u.username as string),
          username: u.username as string,
          pendingEur: 0, pendingBrl: 0, receivedEur: 0, receivedBrl: 0, count: 0,
        })
      }

      // 2) Sobrepõe os totais financeiros agregados por usuário. Se o overview trouxer
      //    um user_id ausente da lista (caso de borda), cria a linha mesmo assim.
      for (const o of (overviewRes.data ?? []) as Record<string, unknown>[]) {
        const id = o.user_id as string
        const row: AdminUserRow = byUser.get(id) ?? {
          userId: id,
          displayName: (o.display_name as string) || (o.username as string),
          username: o.username as string,
          pendingEur: 0, pendingBrl: 0, receivedEur: 0, receivedBrl: 0, count: 0,
        }
        row.pendingBrl = Number(o.total_pending_brl) || 0
        row.pendingEur = Number(o.total_pending_eur) || 0
        row.receivedBrl = Number(o.total_received_brl) || 0
        row.receivedEur = Number(o.total_received_eur) || 0
        row.count = Number(o.total_launches) || 0
        byUser.set(id, row)
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
