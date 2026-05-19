import { useState, useCallback, useEffect } from 'react'
import { getUltimaCotacao, setUltimaCotacao } from '../utils/storage'

export interface CotacaoState {
  valor: number | null
  timestamp: number | null
  loading: boolean
  erro: string | null
  fonte: 'api' | 'cache' | 'manual' | null
}

export function useCotacao(cotacaoManual: number | null) {
  const [state, setState] = useState<CotacaoState>({
    valor: null,
    timestamp: null,
    loading: true,
    erro: null,
    fonte: null,
  })

  const buscarCotacao = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, erro: null }))

    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=BRL')
      if (!response.ok) throw new Error('Falha na API')
      const data = await response.json()
      const valor = data.rates.BRL as number
      setUltimaCotacao(valor)
      setState({ valor, timestamp: Date.now(), loading: false, erro: null, fonte: 'api' })
    } catch {
      const cache = getUltimaCotacao()
      if (cache) {
        setState({
          valor: cache.valor,
          timestamp: cache.timestamp,
          loading: false,
          erro: 'API indisponível — usando cotação em cache',
          fonte: 'cache',
        })
      } else if (cotacaoManual) {
        setState({
          valor: cotacaoManual,
          timestamp: null,
          loading: false,
          erro: 'API indisponível — usando cotação manual',
          fonte: 'manual',
        })
      } else {
        setState({
          valor: null,
          timestamp: null,
          loading: false,
          erro: 'Não foi possível obter a cotação. Configure a cotação manual nas configurações.',
          fonte: null,
        })
      }
    }
  }, [cotacaoManual])

  useEffect(() => {
    buscarCotacao()
  }, [buscarCotacao])

  return { ...state, buscarCotacao }
}
