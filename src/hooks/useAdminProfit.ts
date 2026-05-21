import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface PartnerProfitRow {
  partnerName: string
  profitEur: number
  profitBrl: number
}

export interface ProfitTotals {
  profitEur: number
  profitBrl: number
}

// Lucro consolidado por sócio (nome) em TODAS as contas do sistema. Lê via RPC
// SECURITY DEFINER get_admin_profit_by_partner() — a RLS impede o admin de ler
// launches/partners/custos de outros usuários diretamente. Não cria nada no banco.
//
// A função no Supabase já faz: lucro_launch = net_value_eur − Σ(launch_costs.amount_eur),
// distribui por partner.percentage dos sócios ATIVOS da conta, converte para BRL pela
// exchange_rate de cada launch e agrupa pelo NOME do sócio.
export function useAdminProfit(onError?: (msg: string) => void) {
  const [rows, setRows] = useState<PartnerProfitRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_admin_profit_by_partner')
      if (cancelado) return
      if (error) {
        onError?.('Erro ao carregar lucros por sócio')
        setLoading(false)
        return
      }
      const mapped: PartnerProfitRow[] = ((data ?? []) as Record<string, unknown>[]).map(r => ({
        partnerName: r.partner_name as string,
        profitEur: Number(r.total_profit_eur) || 0,
        profitBrl: Number(r.total_profit_brl) || 0,
      }))
      setRows(mapped)
      setLoading(false)
    })()
    return () => { cancelado = true }
  }, [])

  const totals: ProfitTotals = rows.reduce(
    (acc, r) => ({ profitEur: acc.profitEur + r.profitEur, profitBrl: acc.profitBrl + r.profitBrl }),
    { profitEur: 0, profitBrl: 0 },
  )

  return { rows, totals, loading }
}
