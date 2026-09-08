import { useMemo } from 'react'
import { useStore, useCategoryMap, monthTransactions, monthTotals } from '../store'
import { formatAmount, formatMoney, dayHeading, monthShort } from '../lib/format'
import type { Transaction } from '../types'
import PendingAlert from './PendingAlert'

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

export default function Home({
  onSelect,
  onOpenCaixinhas,
}: {
  onSelect: (tx: Transaction) => void
  onOpenCaixinhas: () => void
}) {
  const { transactions, activeMonth, caixinhas } = useStore()
  const catMap = useCategoryMap()
  const totalSaved = useMemo(() => caixinhas.reduce((s, c) => s + c.balance, 0), [caixinhas])

  const monthTxs = useMemo(
    () => monthTransactions(transactions, activeMonth),
    [transactions, activeMonth],
  )
  const totals = useMemo(() => monthTotals(monthTxs), [monthTxs])
  const groups = useMemo(() => groupByDay(monthTxs), [monthTxs])
  const [y] = activeMonth.split('-')

  return (
    <div className="mx-auto max-w-lg pb-28">
      <div className="px-5 pt-[4.5rem]">
        <PendingAlert />
      </div>

      {/* Hero: month balance */}
      <div className="px-5 pb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">Saldo do mês</p>
        <div className="mt-1 flex items-end gap-2">
          <span
            className={`tnum text-5xl font-extrabold tracking-tight ${
              totals.balance < 0 ? 'text-white' : 'text-brand-400'
            }`}
          >
            {totals.balance < 0 ? '−' : ''}
            {formatAmount(totals.balance)}
          </span>
          <span className="pb-1.5 text-base font-semibold text-neutral-500">BRL</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat label="Despesas" value={totals.expense} tone="text-rose-400" prefix="−" />
          <MiniStat label="Receitas" value={totals.income} tone="text-emerald-400" prefix="+" />
        </div>

        <button
          onClick={onOpenCaixinhas}
          className="mt-3 flex w-full items-center gap-3 rounded-card bg-ink-soft px-4 py-3 text-left active:bg-ink-muted"
        >
          <span className="text-xl">🐷</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-white">Caixinhas</span>
            <span className="block text-xs text-neutral-500">
              {caixinhas.length === 0 ? 'Guarde sobra, metas, resistência' : `${caixinhas.length} caixinha${caixinhas.length > 1 ? 's' : ''}`}
            </span>
          </span>
          <span className="tnum text-[15px] font-bold text-brand-400">{formatMoney(totalSaved)}</span>
          <span className="text-neutral-400">›</span>
        </button>
      </div>

      {/* Day groups */}
      {groups.length === 0 && (
        <div className="px-6 py-24 text-center text-neutral-500">
          <p className="text-lg font-semibold text-neutral-300">
            Sem lançamentos em {monthShort(activeMonth)}/{y}
          </p>
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
                  <span className="text-sm font-semibold text-white">{h.day}</span>
                  <span className="text-xs text-neutral-500">{h.weekday}</span>
                </div>
                <span className="tnum text-xs text-neutral-500">
                  −{formatAmount(g.expense)}
                </span>
              </div>
              <div className="overflow-hidden rounded-card bg-ink-soft">
                {g.items.map((t, i) => {
                  const cat = catMap[t.categoryId]
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left active:bg-ink-muted ${
                        i > 0 ? 'border-t border-ink-line' : ''
                      }`}
                    >
                      <span
                        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-lg"
                        style={{ background: (cat?.color ?? '#666') + '33' }}
                      >
                        {cat?.icon ?? '❓'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">
                        {t.note || cat?.label || 'Sem categoria'}
                      </span>
                      <span
                        className={`tnum text-[15px] font-semibold ${
                          t.kind === 'income' ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {t.kind === 'income' ? '+' : '−'} {formatAmount(t.amount)}
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

function MiniStat({
  label,
  value,
  tone,
  prefix,
}: {
  label: string
  value: number
  tone: string
  prefix: string
}) {
  return (
    <div className="rounded-card bg-ink-soft px-4 py-3">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <div className={`tnum mt-0.5 text-xl font-bold ${tone}`}>
        {value > 0 ? prefix : ''}
        {formatAmount(value)}
      </div>
    </div>
  )
}
