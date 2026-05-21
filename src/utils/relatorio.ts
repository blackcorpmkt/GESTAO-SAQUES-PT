import { Lancamento } from '../types'
import { LaunchCost } from '../hooks/useLaunchCosts'
import { Partner } from '../hooks/usePartners'
import { parseDateBR, getDDMM, getDiaSemana, formatarEURRelatorio } from './formatacao'

const DIV = '━'.repeat(31)
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const eur = (v: number) => `€ ${formatarEURRelatorio(v)}`
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pctFmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function dataCompleta(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function gerarRelatorio(
  lancamentos: Lancamento[],
  nomeRelatorio: string,
  costs: LaunchCost[] = [],
  partners: Partner[] = [],
): string {
  if (lancamentos.length === 0) return 'Nenhum lançamento selecionado.'

  const ordenados = lancamentos
    .slice()
    .sort((a, b) => parseDateBR(a.data_venda).getTime() - parseDateBR(b.data_venda).getTime())

  const ativos = partners.filter(p => p.active)

  const linhas: string[] = []
  let totalBruto = 0
  let totalCustosGeral = 0
  let totalLucroEur = 0
  let totalLucroBrl = 0

  ordenados.forEach((l, idx) => {
    const dataVenda = parseDateBR(l.data_venda)
    const ddmm = getDDMM(l.data_venda)
    const diaSemana = getDiaSemana(dataVenda)
    const cot = l.cotacao_eur_brl

    const bruto = l.valor_bruto_eur
    const pctPart = bruto * l.taxa_gateway / 100
    const fixedPart = l.num_vendas * l.taxa_fixa_eur
    const liquido = l.valor_liquido_eur

    const custosDoLaunch = costs.filter(c => c.launchId === l.id)
    const totalCustos = custosDoLaunch.reduce((s, c) => s + c.amountEur, 0)
    const lucro = liquido - totalCustos
    const lucroBrl = lucro * cot

    if (idx > 0) linhas.push('')
    linhas.push(`VENDAS ${nomeRelatorio} | ${dataCompleta(dataVenda)}`)
    linhas.push(DIV)
    linhas.push(`Lançamento: ${ddmm} – ${diaSemana}`)
    linhas.push(`Vendas aprovadas: ${l.num_vendas}`)
    linhas.push(`Faturamento bruto: ${eur(bruto)}`)
    linhas.push(`Taxa gateway (${pctFmt(l.taxa_gateway)}%): - ${eur(pctPart)}`)
    linhas.push(`Taxa fixa (${l.num_vendas} × €${formatarEURRelatorio(l.taxa_fixa_eur)}): - ${eur(fixedPart)}`)
    linhas.push(`Líquido após gateway: ${eur(liquido)}`)
    linhas.push('')
    linhas.push('Custos adicionais:')
    if (custosDoLaunch.length === 0) {
      linhas.push('  (nenhum)')
    } else {
      for (const c of custosDoLaunch) {
        linhas.push(`  - ${c.description}: - ${eur(c.amountEur)} (${c.currency})`)
      }
    }
    linhas.push(`Total custos: - ${eur(totalCustos)}`)
    linhas.push('')
    linhas.push(`Lucro líquido: ${eur(lucro)} | ${brl(lucroBrl)}`)
    linhas.push(DIV)
    linhas.push('Distribuição por sócio:')
    if (ativos.length === 0) {
      linhas.push('  (nenhum sócio ativo)')
    } else {
      for (const p of ativos) {
        const sEur = lucro * p.percentage / 100
        linhas.push(`  ${p.name} (${pctFmt(p.percentage)}%): ${eur(sEur)} | ${brl(sEur * cot)}`)
      }
    }
    linhas.push(DIV)

    totalBruto += bruto
    totalCustosGeral += totalCustos
    totalLucroEur += lucro
    totalLucroBrl += lucroBrl
  })

  linhas.push('')
  linhas.push('TOTAIS DO PERÍODO')
  linhas.push(`Faturamento bruto total: ${eur(totalBruto)}`)
  linhas.push(`Total custos: ${eur(totalCustosGeral)}`)
  linhas.push(`Lucro líquido total: ${eur(totalLucroEur)} | ${brl(totalLucroBrl)}`)

  return linhas.join('\n')
}
