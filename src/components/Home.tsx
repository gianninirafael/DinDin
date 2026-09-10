import { useMemo } from 'react'
import { useStore, useCategoryMap, monthTransactions, monthTotals, netWorth } from '../store'
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
  onOpenDesejos,
  onOpenContas,
}: {
  onSelect: (tx: Transaction) => void
  onOpenCaixinhas: () => void
  onOpenDesejos: () => void
  onOpenContas: () => void
}) {
  const { transactions, activeMonth, caixinhas, desejos, accounts } = useStore()
  const catMap = useCategoryMap()
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])
  const totalSaved = useMemo(() => caixinhas.reduce((s, c) => s + c.balance, 0), [caixinhas])
  const patrimonio = useMemo(() => netWorth(accounts, transactions), [accounts, transactions])
  const nContas = accounts.filter((a) => !a.archived).length
  const openDesejos = useMemo(() => desejos.filter((d) => d.status === 'aberto').length, [desejos])
  const economizado = useMemo(
    () => desejos.filter((d) => d.status === 'deixei_passar').reduce((s, d) => s + d.amount, 0),
    [desejos],
  )

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
          onClick={onOpenContas}
          className="mt-3 flex w-full items-center gap-3 rounded-card bg-ink-soft px-4 py-3 text-left active:bg-ink-muted"
        >
          <span className="text-xl">🏦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-white">Contas</span>
            <span className="block text-xs text-neutral-500">
              {nContas > 1 ? `${nContas} contas · patrimônio` : 'Saldo por conta · patrimônio'}
            </span>
          </span>
          <span className={`tnum text-[15px] font-bold ${patrimonio < 0 ? 'text-rose-400' : 'text-brand-400'}`}>
            {patrimonio < 0 ? '−' : ''}{formatMoney(Math.abs(patrimonio))}
          </span>
          <span className="text-neutral-400">›</span>
        </button>

        <button
          onClick={onOpenCaixinhas}
          className="mt-2 flex w-full items-center gap-3 rounded-card bg-ink-soft px-4 py-3 text-left active:bg-ink-muted"
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

        <button
          onClick={onOpenDesejos}
          className="mt-2 flex w-full items-center gap-3 rounded-card bg-ink-soft px-4 py-3 text-left active:bg-ink-muted"
        >
          <span className="text-xl">💭</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-white">Desejos</span>
            <span className="block text-xs text-neutral-500">
              {openDesejos === 0
                ? 'Espere 24h antes de comprar por impulso'
                : `${openDesejos} na espera${economizado > 0 ? ' · já economizou deixando passar' : ''}`}
            </span>
          </span>
          {economizado > 0 && (
            <span className="tnum text-[15px] font-bold text-emerald-400">{formatMoney(economizado)}</span>
          )}
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
                  const isTransfer = t.kind === 'transfer'
                  const fromAcc = t.accountId ? accountMap[t.accountId] : undefined
                  const toAcc = t.toAccountId ? accountMap[t.toAccountId] : undefined
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
                        style={{ background: isTransfer ? 'rgba(255,255,255,0.06)' : (cat?.color ?? '#666') + '33' }}
                      >
                        {isTransfer ? '⇄' : cat?.icon ?? '❓'}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-[15px] font-medium text-white">
                          {isTransfer
                            ? `${fromAcc?.name ?? 'Conta'} → ${toAcc?.name ?? 'Conta'}`
                            : t.note || cat?.label || 'Sem categoria'}
                        </span>
                        {t.reimbursed ? (
                          <span className="flex-shrink-0 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">reembolsado</span>
                        ) : t.reimbursable ? (
                          <span className="flex-shrink-0 rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">a receber</span>
                        ) : null}
                        {t.impulse && !t.reimbursed && (
                          <span className="flex-shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">impulso</span>
                        )}
                      </span>
                      <span
                        className={`tnum text-[15px] font-semibold ${
                          isTransfer
                            ? 'text-neutral-400'
                            : t.reimbursed
                              ? 'text-neutral-600 line-through'
                              : t.kind === 'income'
                                ? 'text-emerald-400'
                                : 'text-white'
                        }`}
                      >
                        {isTransfer ? '' : t.kind === 'income' ? '+ ' : '− '}{formatAmount(t.amount)}
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
