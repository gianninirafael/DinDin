import type { Category, Transaction } from '../types'

// Daily-cap model (Fase 2). The daily "posso gastar" is derived from the
// flexible monthly budget — the sum of budgets of categories that count toward
// the daily cap — split across the month's days, with Fri/Sat weighted heavier.

export const WEEKEND_WEIGHT = 1.5 // Fri & Sat get this much of a normal day

/** A category feeds the daily cap unless explicitly excluded (e.g. fixed bills). */
export function countsForCap(c: Category): boolean {
  return (c.kind === 'expense' || c.kind === 'both') && c.countsTowardDailyCap !== false
}

export function flexibleMonthly(cats: Category[]): number {
  return cats.filter(countsForCap).reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)
}

function dow(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay() // 0 Sun .. 6 Sat
}

/** Weight of a single day: Fri(5)/Sat(6) heavier. */
export function dayWeight(iso: string): number {
  const d = dow(iso)
  return d === 5 || d === 6 ? WEEKEND_WEIGHT : 1
}

export function isWeekendCap(iso: string): boolean {
  const d = dow(iso)
  return d === 5 || d === 6
}

function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function isoOf(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

/** Sum of day-weights across a whole month (denominator for the split). */
export function monthTotalWeight(monthKey: string): number {
  let total = 0
  const n = daysInMonth(monthKey)
  for (let d = 1; d <= n; d++) total += dayWeight(isoOf(monthKey, d))
  return total
}

/** The cap for one day = flexible monthly * (day weight / month total weight). */
export function dailyCap(iso: string, flexible: number): number {
  const mk = iso.slice(0, 7)
  const tw = monthTotalWeight(mk)
  return tw ? (flexible * dayWeight(iso)) / tw : 0
}

// ---- ranges ----

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Sunday→Saturday week containing `iso`. */
export function weekRange(iso: string): { start: string; end: string; days: string[] } {
  const d = new Date(iso + 'T00:00:00')
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    days.push(toISO(x))
  }
  return { start: days[0], end: days[6], days }
}

export function monthDays(monthKey: string): string[] {
  const n = daysInMonth(monthKey)
  return Array.from({ length: n }, (_, i) => isoOf(monthKey, i + 1))
}

/** Sum of daily caps over a list of ISO days. */
export function capOverDays(days: string[], flexible: number): number {
  return days.reduce((s, iso) => s + dailyCap(iso, flexible), 0)
}

/** Expense spent within [start,end] (inclusive) in cap-counting categories. */
export function spendInRange(
  txs: Transaction[],
  start: string,
  end: string,
  capCatIds: Set<string>,
): number {
  let sum = 0
  for (const t of txs) {
    if (t.kind !== 'expense' || t.reimbursed) continue
    if (t.date < start || t.date > end) continue
    if (!capCatIds.has(t.categoryId)) continue
    sum += t.amount
  }
  return sum
}
