import { useMemo } from 'react'
import { useStore, monthTransactions, monthTotals } from '../store'
import { CATEGORY_MAP } from '../data/categories'
import { formatAmount, dayHeading, monthShort } from '../lib/format'
import type { Transaction } from '../types'

function groupByDay(txs: Transaction[]) {
  const groups: { date: string; items: Transaction[]; expense: number; income: number }[] = []
  for (const t of txs) {
    let g = groups.find((x) => x.date === t.date)
    if (!g) {
      g = { date: t.date, items: [], expense: 0, income: 0 }
      groups.push(g)
    }
    g.items.push(t)
    if (t.kind === 'expense') g.expense += t.amount
    else if (t.kind === 'income') g.income += t.amount
  }
  return groups
}

export default function Home() {
  const { transactions, activeMonth } = useStore()
  const removeTransaction = useStore((s) => s.removeTransaction)

  const monthTxs = useMemo(
    () => monthTransactions(transactions, activeMonth),
    [transactions, activeMonth],
  )
  const totals = useMemo(() => monthTotals(monthTxs), [monthTxs])
  const groups = useMemo(() => groupByDay(monthTxs), [monthTxs])
  const [y] = activeMonth.split('-')

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* Summary header */}
      <div className="sticky top-0 z-10 bg-neutral-50/90 px-5 pt-6 pb-4 backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">DinDin</h1>
        <div className="mt-4 flex items-stretch gap-3">
          <div className="grid w-16 flex-shrink-0 place-items-center rounded-card bg-ink text-white">
            <span className="text-lg font-bold leading-none">{y}</span>
            <span className="text-sm text-neutral-300">{monthShort(activeMonth).toLowerCase()}.</span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Stat label="Despesas" value={totals.expense} tone="text-rose-500" />
            <Stat label="Receitas" value={totals.income} tone="text-brand-600" />
            <Stat
              label="Saldo"
              value={totals.balance}
              tone={totals.balance < 0 ? 'text-rose-500' : 'text-ink'}
              signed
            />
          </div>
        </div>
      </div>

      {/* Day groups */}
      {groups.length === 0 && (
        <div className="px-6 py-24 text-center text-neutral-400">
          <p className="text-lg font-medium">Sem lançamentos em {monthShort(activeMonth)}/{y}</p>
          <p className="mt-1 text-sm">Toque no + para adicionar sua primeira transação.</p>
        </div>
      )}

      <div className="space-y-1 px-4">
        {groups.map((g) => {
          const h = dayHeading(g.date)
          return (
            <div key={g.date} className="pt-3">
              <div className="flex items-baseline justify-between px-2 pb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{h.day}</span>
                  <span className="text-xs text-neutral-400">{h.weekday}</span>
                </div>
                <span className="tnum text-xs text-neutral-400">
                  Despesas: {formatAmount(g.expense)}
                </span>
              </div>
              <div className="overflow-hidden rounded-card bg-white shadow-card">
                {g.items.map((t, i) => {
                  const cat = CATEGORY_MAP[t.categoryId]
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (confirm(`Excluir "${t.note || cat?.label}"?`)) removeTransaction(t.id)
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left active:bg-neutral-50 ${
                        i > 0 ? 'border-t border-neutral-100' : ''
                      }`}
                    >
                      <span
                        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-lg"
                        style={{ background: (cat?.color ?? '#ddd') + '55' }}
                      >
                        {cat?.icon ?? '❓'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                        {t.note || cat?.label || 'Sem categoria'}
                      </span>
                      <span
                        className={`tnum text-[15px] font-semibold ${
                          t.kind === 'income' ? 'text-brand-600' : 'text-ink'
                        }`}
                      >
                        {t.kind === 'income' ? '+' : '-'} {formatAmount(t.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  signed,
}: {
  label: string
  value: number
  tone: string
  signed?: boolean
}) {
  return (
    <div className="flex flex-col justify-center rounded-card bg-white px-3 py-2 shadow-card">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className={`tnum text-lg font-bold leading-tight ${tone}`}>
        {signed && value < 0 ? '- ' : ''}
        {formatAmount(value)}
      </span>
    </div>
  )
}
