const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const brlCompact = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** R$ 1.234,56 */
export function formatMoney(value: number): string {
  return brl.format(value)
}

/** 1.234,56 — no currency symbol, for big hero numbers */
export function formatAmount(value: number): string {
  return brlCompact.format(Math.abs(value))
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const weekdays = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${monthNames[m - 1]} ${y}`
}

export function monthShort(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number)
  return monthNames[m - 1]
}

export function dayHeading(iso: string): { day: string; weekday: string } {
  const d = new Date(iso + 'T00:00:00')
  return {
    day: `${d.getDate()} de ${monthNames[d.getMonth()].toLowerCase()}`,
    weekday: weekdays[d.getDay()],
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}
