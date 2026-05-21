import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Partner {
  displayName: string
  username: string
  percentage: number
  role: 'admin' | 'user'
}

type PartnerRow = {
  display_name: string
  username: string
  percentage: number
  role: string
}

export function usePartners(onError?: (msg: string) => void) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_active_partners').then(({ data, error }) => {
      if (error) {
        onError?.('Erro ao carregar sócios')
      } else {
        setPartners((data ?? []).map((r: PartnerRow) => ({
          displayName: r.display_name,
          username: r.username,
          percentage: Number(r.percentage),
          role: r.role as 'admin' | 'user',
        })))
      }
      setLoading(false)
    })
  }, [])

  return { partners, loading }
}
