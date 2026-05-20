import { useState, useEffect, useCallback } from 'react'
import { Lancamento } from '../types'
import { getLancamentosForUser, setLancamentosForUser } from '../utils/storage'

export function useLancamentos(userId: string) {
  const [lancamentos, setLancamentosState] = useState<Lancamento[]>([])

  useEffect(() => {
    setLancamentosState(getLancamentosForUser(userId))
  }, [userId])

  const addLancamento = useCallback((lancamento: Lancamento) => {
    setLancamentosState(prev => {
      const novo = [lancamento, ...prev]
      setLancamentosForUser(userId, novo)
      return novo
    })
  }, [userId])

  const toggleStatus = useCallback((id: string) => {
    setLancamentosState(prev => {
      const updated = prev.map(l =>
        l.id === id
          ? { ...l, status: (l.status === 'pendente' ? 'recebido' : 'pendente') as Lancamento['status'] }
          : l
      )
      setLancamentosForUser(userId, updated)
      return updated
    })
  }, [userId])

  const deleteLancamento = useCallback((id: string) => {
    setLancamentosState(prev => {
      const filtered = prev.filter(l => l.id !== id)
      setLancamentosForUser(userId, filtered)
      return filtered
    })
  }, [userId])

  const importLancamentos = useCallback((data: Lancamento[]) => {
    setLancamentosForUser(userId, data)
    setLancamentosState(data)
  }, [userId])

  return { lancamentos, addLancamento, toggleStatus, deleteLancamento, importLancamentos }
}
