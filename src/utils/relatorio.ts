import { Lancamento } from '../types'
import { parseDateBR, getDDMM, getDiaSemanaAbreviado, formatarEURRelatorio, formatarBRLRelatorio } from './formatacao'

export function gerarRelatorio(lancamentos: Lancamento[], nomeRelatorio: string): string {
  if (lancamentos.length === 0) return 'Nenhum lançamento selecionado.'

  const ordenados = lancamentos
    .slice()
    .sort((a, b) => parseDateBR(a.data_venda).getTime() - parseDateBR(b.data_venda).getTime())

  const linhas: string[] = [`VENDAS ${nomeRelatorio}`]
  let totalBruto = 0
  let totalVendas = 0

  for (const l of ordenados) {
    const dataVenda = parseDateBR(l.data_venda)
    const ddmm = getDDMM(l.data_venda)
    const diaSemana = getDiaSemanaAbreviado(dataVenda)
    const ddmmReceb = getDDMM(l.data_recebimento)

    linhas.push('')
    linhas.push(`${ddmm} - ${diaSemana}`)
    linhas.push(`${l.num_vendas} vendas aprovadas`)
    linhas.push(`${formatarEURRelatorio(l.valor_bruto_eur)} euros`)
    linhas.push(`Recebimento Líquido D3 - ${ddmmReceb} (${l.dia_semana_recebimento})`)
    linhas.push(`${formatarEURRelatorio(l.valor_liquido_eur)} euros - ${formatarBRLRelatorio(l.valor_brl)}`)

    totalBruto += l.valor_bruto_eur
    totalVendas += l.num_vendas
  }

  linhas.push('_')
  linhas.push(`Total bruto:  ${formatarEURRelatorio(totalBruto)}`)
  linhas.push(`Vendas totais: ${totalVendas}`)

  return linhas.join('\n')
}
