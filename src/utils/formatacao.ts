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
