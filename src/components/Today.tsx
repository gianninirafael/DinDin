import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { formatAmount, formatMoney, formatDMY, todayISO } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'
import type { Caixinha } from '../types'
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

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
]

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Today() {
  const { transactions, categories, caixinhas, weeklyWallet, setWeeklyWallet, createPendencia } =
    useStore()
  const [view, setView] = useState<View>('day')
  const [sobraOpen, setSobraOpen] = useState(false)
  const [walletEdit, setWalletEdit] = useState(false)
  const today = todayISO()
  const usingWallet = weeklyWallet > 0

  const flexible = useMemo(() => flexibleMonthly(categories), [categories])
  const capCatIds = useMemo(
    () => new Set(categories.filter(countsForCap).map((c) => c.id)),
    [categories],
  )

  const week = useMemo(() => weekRange(today), [today])
  const monthKey = today.slice(0, 7)
  const mDays = useMemo(() => monthDays(monthKey), [monthKey])

  // Period cap + spent. When the physical weekly wallet is set, it is the
  // source of truth: day = weekly/7, week = weekly, month ≈ weekly per week.
  const { cap, spent, periodLabel } = useMemo(() => {
    if (view === 'day') {
      return {
        cap: usingWallet ? weeklyWallet / 7 : dailyCap(today, flexible),
        spent: spendInRange(transactions, today, today, capCatIds),
        periodLabel: 'hoje',
      }
    }
    if (view === 'week') {
      return {
        cap: usingWallet ? weeklyWallet : capOverDays(week.days, flexible),
        spent: spendInRange(transactions, week.start, week.end, capCatIds),
        periodLabel: 'esta semana',
      }
    }
    return {
      cap: usingWallet ? (weeklyWallet * mDays.length) / 7 : capOverDays(mDays, flexible),
      spent: spendInRange(transactions, mDays[0], mDays[mDays.length - 1], capCatIds),
      periodLabel: 'este mês',
    }
  }, [view, today, flexible, capCatIds, transactions, week, mDays, usingWallet, weeklyWallet])

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

      {flexible === 0 && !usingWallet ? (
        <div className="rounded-card bg-ink-soft p-6 text-center">
          <p className="text-[15px] font-medium text-neutral-200">Sem teto ainda</p>
          <p className="mt-1 text-sm text-neutral-500">
            Defina orçamentos nas categorias (aba Orçamento) que contam pro teto diário — ou use a
            carteira semanal abaixo.
          </p>
          <button onClick={() => { playClick(); setWalletEdit(true) }} className="mt-4 rounded-full bg-ink-muted px-4 py-2 text-sm font-semibold text-brand-400">
            💵 Usar carteira semanal
          </button>
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

          {/* Actions: guardar sobra / repor / carteira */}
          <div className="mt-3 space-y-2">
            {!over && left > 0 && (
              <button
                onClick={() => { playClick(); setSobraOpen(true) }}
                className="w-full rounded-2xl bg-ink-soft py-3 text-sm font-semibold text-brand-400 active:bg-ink-muted"
              >
                💰 Guardar sobra ({formatAmount(left)}) numa caixinha
              </button>
            )}
            {over && usingWallet && (
              <button
                onClick={async () => {
                  await createPendencia({ origin: 'estouro', amount: -left, note: 'Repor carteira semanal' })
                  playConfirm()
                }}
                className="w-full rounded-2xl border border-rose-400/40 bg-rose-400/10 py-3 text-sm font-semibold text-rose-400"
              >
                ⚠︎ Marcar reposição de {formatAmount(-left)}
              </button>
            )}
            <button
              onClick={() => { playClick(); setWalletEdit(true) }}
              className="w-full py-1 text-center text-xs text-neutral-500"
            >
              {usingWallet ? `Carteira semanal: ${formatMoney(weeklyWallet)}/sem · editar` : 'Usar carteira semanal física'}
            </button>
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

      {sobraOpen && (
        <SobraSheet
          amount={left}
          caixinhas={caixinhas}
          onClose={() => setSobraOpen(false)}
          onPick={async (cx) => {
            await createPendencia({ origin: 'sobra', caixinhaId: cx.id, amount: left, note: `Sobra ${periodLabel}` })
            playConfirm()
            setSobraOpen(false)
          }}
        />
      )}

      {walletEdit && (
        <WalletSheet
          initial={weeklyWallet}
          onClose={() => setWalletEdit(false)}
          onSave={(v) => { setWeeklyWallet(v); setWalletEdit(false) }}
        />
      )}
    </div>
  )
}

function SobraSheet({
  amount, caixinhas, onClose, onPick,
}: {
  amount: number
  caixinhas: Caixinha[]
  onClose: () => void
  onPick: (cx: Caixinha) => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">Guardar sobra de {formatMoney(amount)}</h3>
        <p className="mb-4 text-sm text-neutral-500">Escolha a caixinha. Vira um lembrete até você transferir de verdade.</p>
        {caixinhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Crie uma caixinha primeiro (Início → 🐷 Caixinhas).</p>
        ) : (
          <div className="space-y-2">
            {caixinhas.map((c) => (
              <button key={c.id} onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 rounded-2xl bg-ink-muted px-4 py-3 text-left active:bg-ink-line">
                <span className="grid h-9 w-9 place-items-center rounded-full text-base" style={{ background: c.color + '33' }}>{c.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">{c.name}</span>
                <span className="tnum text-sm text-neutral-400">{formatMoney(c.balance)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WalletSheet({ initial, onClose, onSave }: { initial: number; onClose: () => void; onSave: (v: number) => void }) {
  const [raw, setRaw] = useState(initial ? initial.toFixed(2).replace('.', ',') : '')
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">Carteira semanal física</h3>
        <p className="mb-4 text-sm text-neutral-500">
          Valor guardado por semana. O app libera a fatia do dia (valor ÷ 7) como saldo gastável. 0 desliga.
        </p>
        <div className="flex items-center gap-2 rounded-2xl bg-ink-muted px-4">
          <span className="text-lg font-semibold text-neutral-500">R$</span>
          <input autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
            className="tnum w-full bg-transparent py-3.5 text-right text-2xl font-bold text-white outline-none placeholder:text-neutral-600" />
        </div>
        <button onClick={() => { playClick(); onSave(parseNum(raw)) }}
          className="mt-4 w-full rounded-2xl bg-brand-500 py-4 text-base font-bold text-black">Salvar</button>
      </div>
    </div>
  )
}
