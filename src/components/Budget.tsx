import { useMemo, useState } from 'react'
import type { Category } from '../types'
import { useStore, monthSpendByCategory, totalBudgeted } from '../store'
import { formatMoney, formatAmount, monthShort } from '../lib/format'
import { playClick } from '../lib/sound'

type Editing = { type: 'available' } | { type: 'cat'; cat: Category } | null

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

export default function Budget() {
  const { transactions, categories, activeMonth, availableToBudget, setAvailableToBudget, saveCategory } =
    useStore()

  const spend = useMemo(() => monthSpendByCategory(transactions, activeMonth), [transactions, activeMonth])
  const budgeted = useMemo(() => totalBudgeted(categories), [categories])
  const toAllocate = availableToBudget - budgeted

  const cats = useMemo(
    () =>
      categories
        .filter((c) => c.kind === 'expense' || c.kind === 'both')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories],
  )

  const [editing, setEditing] = useState<Editing>(null)

  const allocTone =
    toAllocate === 0 ? 'text-emerald-400' : toAllocate > 0 ? 'text-brand-400' : 'text-rose-400'
  const allocLabel =
    toAllocate === 0 ? 'Tudo alocado' : toAllocate > 0 ? 'Falta alocar' : 'Alocado a mais'

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[4.5rem]">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight text-white">Orçamento</h1>
      <p className="mb-4 px-1 text-sm text-neutral-500">{monthShort(activeMonth)} · base-zero</p>

      {/* Pool + to-allocate */}
      <div className="mb-4 rounded-card bg-ink-soft p-4">
        <button
          onClick={() => setEditing({ type: 'available' })}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm text-neutral-400">Disponível para orçar</span>
          <span className="tnum text-lg font-bold text-white">
            {formatMoney(availableToBudget)} <span className="text-neutral-600">✎</span>
          </span>
        </button>
        <div className="mt-3 flex items-end justify-between border-t border-ink-line pt-3">
          <span className="text-sm text-neutral-400">A alocar</span>
          <div className="text-right">
            <div className={`tnum text-2xl font-extrabold ${allocTone}`}>
              {toAllocate < 0 ? '−' : ''}
              {formatAmount(toAllocate)}
            </div>
            <div className={`text-xs ${allocTone}`}>{allocLabel}</div>
          </div>
        </div>
      </div>

      {/* Category budgets */}
      <div className="space-y-2">
        {cats.map((c) => {
          const alloc = c.monthlyBudget ?? 0
          const gasto = spend[c.id] ?? 0
          const restante = alloc - gasto
          const over = gasto > alloc && alloc > 0
          const pct = alloc > 0 ? Math.min(100, Math.round((gasto / alloc) * 100)) : 0
          return (
            <button
              key={c.id}
              onClick={() => setEditing({ type: 'cat', cat: c })}
              className="block w-full rounded-card bg-ink-soft p-3 text-left active:bg-ink-muted"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-base"
                  style={{ background: c.color + '33' }}
                >
                  {c.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium text-white">{c.label}</span>
                    <span
                      className={`tnum text-[15px] font-semibold ${
                        over ? 'text-rose-400' : alloc === 0 ? 'text-neutral-600' : 'text-white'
                      }`}
                    >
                      {alloc === 0 ? 'sem orçamento' : `${over ? '−' : ''}${formatAmount(Math.abs(restante))}`}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="tnum text-xs text-neutral-500">
                      {formatAmount(gasto)} de {formatAmount(alloc)}
                    </span>
                    <span className="text-xs text-neutral-600">
                      {alloc > 0 ? (over ? 'estourou' : 'restante') : 'toque p/ definir'}
                    </span>
                  </div>
                </div>
              </div>
              {alloc > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: over ? '#fb7185' : c.color }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {editing && (
        <NumberSheet
          title={editing.type === 'available' ? 'Disponível para orçar' : editing.cat.label}
          subtitle={editing.type === 'available' ? 'Quanto você tem pra distribuir este mês' : 'Orçamento mensal desta categoria'}
          initial={editing.type === 'available' ? availableToBudget : editing.cat.monthlyBudget ?? 0}
          onClose={() => setEditing(null)}
          onSave={(value) => {
            if (editing.type === 'available') setAvailableToBudget(value)
            else saveCategory({ ...editing.cat, monthlyBudget: value || undefined })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function NumberSheet({
  title,
  subtitle,
  initial,
  onClose,
  onSave,
}: {
  title: string
  subtitle: string
  initial: number
  onClose: () => void
  onSave: (value: number) => void
}) {
  const [raw, setRaw] = useState(initial ? initial.toFixed(2).replace('.', ',') : '')

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mb-4 text-sm text-neutral-500">{subtitle}</p>
        <div className="flex items-center gap-2 rounded-2xl bg-ink-muted px-4">
          <span className="text-lg font-semibold text-neutral-500">R$</span>
          <input
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="tnum w-full bg-transparent py-3.5 text-right text-2xl font-bold text-white outline-none placeholder:text-neutral-600"
          />
        </div>
        <button
          onClick={() => {
            playClick()
            onSave(parseNum(raw))
          }}
          className="mt-4 w-full rounded-2xl bg-brand-500 py-4 text-base font-bold text-black active:scale-[0.99]"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}
