export function formatarMoedaBR(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatarEUR(valor: number): string {
  return '€ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarEURRelatorio(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarBRLRelatorio(valor: number): string {
  return 'R$' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Máscara de moeda pt-BR enquanto digita: milhar com ponto (.), decimal com
// vírgula (,) e no máximo 2 casas. Ex.: "10000,5" -> "10.000,5"; "1000050" -> "1.000.050".
export function maskMoedaBR(raw: string): string {
  const limpo = raw.replace(/[^\d,]/g, '')
  if (!limpo) return ''
  const temVirgula = limpo.includes(',')
  const [intRaw, ...decParts] = limpo.split(',')
  const intDigits = intRaw.replace(/^0+(?=\d)/, '') // tira zeros à esquerda (mantém um "0")
  const intFmt = (intDigits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (!temVirgula) return intFmt
  const dec = decParts.join('').slice(0, 2)
  return `${intFmt},${dec}`
}

// Converte a string mascarada ("10.000,50") em número (10000.5).
export function parseMoedaBR(masked: string): number {
  const n = parseFloat(masked.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export function parseDateBR(dateStr: string): Date {
  const [d, m, y] = dateStr.split('/')
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
}

export function formatDateBR(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export function formatDateInput(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${y}-${m}-${d}`
}

export function getDiaSemana(date: Date): string {
  const dias = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']
  return dias[date.getDay()]
}

export function getDiaSemanaAbreviado(date: Date): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return dias[date.getDay()]
}

export function getDiaSemanaVenda(date: Date): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return dias[date.getDay()]
}

export function getDDMM(dateStr: string): string {
  return dateStr.substring(0, 5)
}

export function formatarHora(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
