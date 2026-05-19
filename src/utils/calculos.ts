export function addDiasUteis(data: Date, dias: number): Date {
  let count = 0
  const current = new Date(data)
  while (count < dias) {
    current.setDate(current.getDate() + 1)
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return current
}

export function calcularLiquido(
  bruto: number,
  taxaPercent: number,
  taxaFixaEur: number,
  numVendas: number,
): number {
  const descontoPercent = bruto * (taxaPercent / 100)
  const descontoFixo = taxaFixaEur * numVendas
  return Math.max(0, bruto - descontoPercent - descontoFixo)
}
