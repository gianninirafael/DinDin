import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { formatAmount, formatDMY, todayISO } from '../lib/format'
import {
  countsForCap,
  flexibleMonthly,
  dailyCap,
  isWeekendCap,
  weekRange,
  monthDays,
  capOverDays,
  spendInRange,
} from '../lib/budget'

type View = 'day' | 'week' | 'month'

const VIEWS: { key: View; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
]

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Today() {
  const { transactions, categories } = useStore()
  const [view, setView] = useState<View>('day')
  const today = todayISO()

  const flexible = useMemo(() => flexibleMonthly(categories), [categories])
  const capCatIds = useMemo(
    () => new Set(categories.filter(countsForCap).map((c) => c.id)),
    [categories],
  )

  const week = useMemo(() => weekRange(today), [today])
  const monthKey = today.slice(0, 7)
  const mDays = useMemo(() => monthDays(monthKey), [monthKey])

  // Period cap + spent
  const { cap, spent, periodLabel } = useMemo(() => {
    if (view === 'day') {
      return {
        cap: dailyCap(today, flexible),
        spent: spendInRange(transactions, today, today, capCatIds),
        periodLabel: 'hoje',
      }
    }
    if (view === 'week') {
      return {
        cap: capOverDays(week.days, flexible),
        spent: spendInRange(transactions, week.start, week.end, capCatIds),
        periodLabel: 'esta semana',
      }
    }
    return {
      cap: capOverDays(mDays, flexible),
      spent: spendInRange(transactions, mDays[0], mDays[mDays.length - 1], capCatIds),
      periodLabel: 'este mês',
    }
  }, [view, today, flexible, capCatIds, transactions, week, mDays])

  const left = cap - spent
  const over = left < 0
  const tone = over ? 'text-rose-400' : 'text-brand-400'

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-[4.5rem]">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight text-white">Hoje</h1>
      <p className="mb-4 px-1 text-sm text-neutral-500">
        {formatDMY(today)}
        {isWeekendCap(today) && view === 'day' ? ' · fim de semana (teto maior)' : ''}
      </p>

      {/* View toggle */}
      <div className="mb-5 flex rounded-full bg-ink-muted p-1 text-sm font-medium">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-full py-2 transition ${
              view === v.key ? 'bg-white text-neutral-900' : 'text-neutral-300'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {flexible === 0 ? (
        <div className="rounded-card bg-ink-soft p-6 text-center">
          <p className="text-[15px] font-medium text-neutral-200">Sem teto ainda</p>
          <p className="mt-1 text-sm text-neutral-500">
            Defina orçamentos nas categorias (aba Orçamento) que contam pro teto diário e o número
            aparece aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Hero: posso gastar */}
          <div className="rounded-card bg-ink-soft p-5 text-center">
            <p className="text-sm text-neutral-400">
              {over ? 'Estourou' : 'Posso gastar'} {periodLabel}
            </p>
            <div className={`tnum mt-1 text-5xl font-extrabold tracking-tight ${tone}`}>
              {over ? '−' : ''}
              {formatAmount(left)}
            </div>
            <div className="mt-3 flex justify-center gap-6 text-sm">
              <span className="text-neutral-500">
                Teto <span className="tnum font-semibold text-neutral-300">{formatAmount(cap)}</span>
              </span>
              <span className="text-neutral-500">
                Gasto <span className="tnum font-semibold text-neutral-300">{formatAmount(spent)}</span>
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${cap > 0 ? Math.min(100, (spent / cap) * 100) : 0}%`,
                  background: over ? '#fb7185' : '#ffc400',
                }}
              />
            </div>
          </div>

          {/* Week breakdown */}
          {view === 'week' && (
            <div className="mt-4 rounded-card bg-ink-soft p-3">
              <div className="flex items-end justify-between gap-1">
                {week.days.map((iso) => {
                  const c = dailyCap(iso, flexible)
                  const s = spendInRange(transactions, iso, iso, capCatIds)
                  const ratio = c > 0 ? Math.min(1, s / c) : 0
                  const dOver = s > c && c > 0
                  const isToday = iso === today
                  return (
                    <div key={iso} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-24 w-full items-end justify-center">
                        <div className="relative w-4/5 overflow-hidden rounded-md bg-ink-muted" style={{ height: '100%' }}>
                          <div
                            className="absolute bottom-0 w-full rounded-md"
                            style={{
                              height: `${ratio * 100}%`,
                              background: dOver ? '#fb7185' : '#ffc400',
                            }}
                          />
                        </div>
                      </div>
                      <span className={`text-[11px] ${isToday ? 'font-bold text-brand-400' : 'text-neutral-500'}`}>
                        {WEEKDAY_SHORT[new Date(iso + 'T00:00:00').getDay()]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-center text-xs text-neutral-600">Gasto por dia vs. teto do dia</p>
            </div>
          )}

          <p className="mt-4 px-2 text-center text-xs text-neutral-600">
            O dia recomeça do próprio teto — não empresta de amanhã. Semana e mês seguem contando o
            estouro.
          </p>
        </>
      )}
    </div>
  )
}
