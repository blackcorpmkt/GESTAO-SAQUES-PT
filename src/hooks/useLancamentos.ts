import { useState, useCallback } from 'react'
import { Lancamento } from '../types'
import { getLancamentos, setLancamentos } from '../utils/storage'

export function useLancamentos() {
  const [lancamentos, setLancamentosState] = useState<Lancamento[]>(getLancamentos)

  const addLancamento = useCallback((lancamento: Lancamento) => {
    setLancamentosState(prev => {
      const novo = [lancamento, ...prev]
      setLancamentos(novo)
      return novo
    })
  }, [])

  const toggleStatus = useCallback((id: string) => {
    setLancamentosState(prev => {
      const updated = prev.map(l =>
        l.id === id ? { ...l, status: (l.status === 'pendente' ? 'recebido' : 'pendente') as Lancamento['status'] } : l
      )
      setLancamentos(updated)
      return updated
    })
  }, [])

  const deleteLancamento = useCallback((id: string) => {
    setLancamentosState(prev => {
      const filtered = prev.filter(l => l.id !== id)
      setLancamentos(filtered)
      return filtered
    })
  }, [])

  const importLancamentos = useCallback((data: Lancamento[]) => {
    setLancamentos(data)
    setLancamentosState(data)
  }, [])

  return { lancamentos, addLancamento, toggleStatus, deleteLancamento, importLancamentos }
}
