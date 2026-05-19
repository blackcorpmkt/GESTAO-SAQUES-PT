import { useState, useCallback } from 'react'
import { Toast } from '../types'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, mensagem, tipo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
