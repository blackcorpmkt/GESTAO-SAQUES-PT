import { useState, useEffect, useCallback } from 'react'
import { Lancamento } from '../types'
import { getDiaSemana } from '../utils/formatacao'
import { supabase } from '../lib/supabaseClient'

// YYYY-MM-DD → DD/MM/YYYY
function fromISODate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// DD/MM/YYYY → YYYY-MM-DD
function toISODate(br: string): string {
  const [d, m, y] = br.split('/')
  return `${y}-${m}-${d}`
}

type DbRow = {
  id: string
  user_id: string
  launch_date: string
  sales_count: number
  gross_value_eur: number
  net_value_eur: number
  gateway_percentage: number
  gateway_fixed_fee: number
  net_value_brl: number
  exchange_rate: number
  payment_date: string
  status: string
  created_at: string
}

function dbToLancamento(row: DbRow): Lancamento {
  const paymentDate = new Date(row.payment_date + 'T12:00:00')
  return {
    id: row.id,
    data_venda: fromISODate(row.launch_date),
    num_vendas: row.sales_count,
    valor_bruto_eur: row.gross_value_eur,
    valor_liquido_eur: row.net_value_eur,
    taxa_gateway: row.gateway_percentage,
    taxa_fixa_eur: row.gateway_fixed_fee,
    data_recebimento: fromISODate(row.payment_date),
    dia_semana_recebimento: getDiaSemana(paymentDate),
    cotacao_eur_brl: row.exchange_rate,
    valor_brl: row.net_value_brl,
    status: row.status === 'received' ? 'recebido' : 'pendente',
    created_at: row.created_at,
  }
}

function lancamentoToDb(l: Lancamento, userId: string) {
  return {
    id: l.id,
    user_id: userId,
    launch_date: toISODate(l.data_venda),
    sales_count: l.num_vendas,
    gross_value_eur: l.valor_bruto_eur,
    net_value_eur: l.valor_liquido_eur,
    gateway_percentage: l.taxa_gateway,
    gateway_fixed_fee: l.taxa_fixa_eur,
    net_value_brl: l.valor_brl,
    exchange_rate: l.cotacao_eur_brl,
    payment_date: toISODate(l.data_recebimento),
    status: l.status === 'recebido' ? 'received' : 'pending',
  }
}

export function useLancamentos(userId: string, onError?: (msg: string) => void) {
  const [lancamentos, setLancamentosState] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('launches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) onError?.('Erro ao carregar lançamentos')
        else setLancamentosState((data ?? []).map(row => dbToLancamento(row as DbRow)))
        setLoading(false)
      })
  }, [userId])

  const addLancamento = useCallback((lancamento: Lancamento) => {
    // Atualização otimista: UI responde imediatamente
    setLancamentosState(prev => [lancamento, ...prev])
    supabase
      .from('launches')
      .insert(lancamentoToDb(lancamento, userId))
      .then(({ error }) => {
        if (error) {
          // Reverte se o Supabase rejeitar
          setLancamentosState(prev => prev.filter(l => l.id !== lancamento.id))
          onError?.('Erro ao salvar lançamento')
        }
      })
  }, [userId, onError])

  const toggleStatus = useCallback((id: string) => {
    setLancamentosState(prev => {
      const updated = prev.map(l =>
        l.id === id
          ? { ...l, status: (l.status === 'pendente' ? 'recebido' : 'pendente') as Lancamento['status'] }
          : l
      )
      const newStatus = updated.find(l => l.id === id)?.status
      const dbStatus = newStatus === 'recebido' ? 'received' : 'pending'

      supabase
        .from('launches')
        .update({ status: dbStatus })
        .eq('id', id)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            // Reverte toggle
            setLancamentosState(prev2 =>
              prev2.map(l =>
                l.id === id
                  ? { ...l, status: (l.status === 'pendente' ? 'recebido' : 'pendente') as Lancamento['status'] }
                  : l
              )
            )
            onError?.('Erro ao atualizar status')
          }
        })

      return updated
    })
  }, [userId, onError])

  const deleteLancamento = useCallback((id: string) => {
    let backup: Lancamento | undefined
    setLancamentosState(prev => {
      backup = prev.find(l => l.id === id)
      return prev.filter(l => l.id !== id)
    })
    supabase
      .from('launches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error && backup) {
          setLancamentosState(prev => [backup!, ...prev])
          onError?.('Erro ao deletar lançamento')
        }
      })
  }, [userId, onError])

  const importLancamentos = useCallback(async (data: Lancamento[]) => {
    const { error: delError } = await supabase
      .from('launches')
      .delete()
      .eq('user_id', userId)
    if (delError) { onError?.('Erro ao importar: falha ao limpar dados existentes'); return }

    if (data.length > 0) {
      const { error: insError } = await supabase
        .from('launches')
        .insert(data.map(l => lancamentoToDb(l, userId)))
      if (insError) { onError?.('Erro ao importar lançamentos'); return }
    }

    setLancamentosState(data)
  }, [userId, onError])

  return { lancamentos, loading, addLancamento, toggleStatus, deleteLancamento, importLancamentos }
}
