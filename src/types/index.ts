export interface Lancamento {
  id: string
  data_venda: string
  num_vendas: number
  valor_bruto_eur: number
  valor_liquido_eur: number
  taxa_gateway: number
  taxa_fixa_eur: number
  data_recebimento: string
  dia_semana_recebimento: string
  cotacao_eur_brl: number
  valor_brl: number
  status: 'pendente' | 'recebido'
  created_at: string
}

export interface Config {
  taxa_gateway: number
  taxa_fixa_eur: number
  nome_relatorio: string
  cotacao_manual: number | null
}

export interface Toast {
  id: string
  mensagem: string
  tipo: 'sucesso' | 'erro' | 'info'
}
