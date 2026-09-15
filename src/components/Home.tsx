import { useMemo } from 'react'
import { useStore, useCategoryMap, monthTransactions, monthTotals, txBelongsToAccount, accountBalance } from '../store'
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
}: {
  onSelect: (tx: Transaction) => void
}) {
  const { transactions, activeMonth, accounts, homeAccount, setHomeAccount } = useStore()
  const catMap = useCategoryMap()
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])

  const visibleAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const showAccountBar = visibleAccounts.length > 1
  // Effective filter: only when it points at a still-existing account and there's
  // more than one account to choose from; otherwise it's the "visão geral".
  const activeAccount =
    showAccountBar && homeAccount && visibleAccounts.some((a) => a.id === homeAccount)
      ? homeAccount
      : null
  const activeAccountObj = activeAccount ? accountMap[activeAccount] : undefined

  const scoped = useMemo(
    () => (activeAccount ? transactions.filter((t) => txBelongsToAccount(t, activeAccount)) : transactions),
    [transactions, activeAccount],
  )
  const monthTxs = useMemo(
    () => monthTransactions(scoped, activeMonth),
    [scoped, activeMonth],
  )
  const totals = useMemo(() => monthTotals(monthTxs), [monthTxs])
  const groups = useMemo(() => groupByDay(monthTxs), [monthTxs])
  const currentBalance = useMemo(
    () => (activeAccountObj ? accountBalance(activeAccountObj, transactions) : 0),
    [activeAccountObj, transactions],
  )
  const [y] = activeMonth.split('-')

  return (
    <div className="mx-auto max-w-lg pb-28">
      <div className="px-5 pt-[4.5rem]">
        <PendingAlert />
      </div>

      {/* Account switcher — "visão geral" + one chip per account */}
      {showAccountBar && (
        <div className="no-scrollbar mb-1 flex gap-2 overflow-x-auto px-5 pb-1">
          <AccountTab
            label="Visão geral"
            icon="🗂️"
            color="#ffc400"
            active={activeAccount === null}
            onClick={() => setHomeAccount(null)}
          />
          {visibleAccounts.map((a) => (
            <AccountTab
              key={a.id}
              label={a.name}
              icon={a.icon}
              color={a.color}
              active={activeAccount === a.id}
              onClick={() => setHomeAccount(a.id)}
            />
          ))}
        </div>
      )}

      {/* Hero: month balance (scoped to the active account when filtered) */}
      <div className="px-5 pb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          {activeAccountObj ? `Saldo do mês · ${activeAccountObj.name}` : 'Saldo do mês'}
        </p>
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
        {activeAccountObj && (
          <p className="mt-1 text-xs text-neutral-500">
            Saldo atual da conta:{' '}
            <span className={`tnum font-semibold ${currentBalance < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
              {currentBalance < 0 ? '−' : ''}{formatMoney(Math.abs(currentBalance))}
            </span>
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat label="Despesas" value={totals.expense} tone="text-rose-400" prefix="−" />
          <MiniStat label="Receitas" value={totals.income} tone="text-emerald-400" prefix="+" />
        </div>
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

function AccountTab({
  label,
  icon,
  color,
  active,
  onClick,
}: {
  label: string
  icon: string
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition"
      style={{
        background: active ? color : 'rgba(255,255,255,0.06)',
        color: active ? '#000' : '#d4d4d4',
      }}
    >
      <span className="text-[13px]">{icon}</span>
      <span>{label}</span>
    </button>
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
