import { useMemo, useState } from 'react'
import type { Habit } from '../types'
import { useStore } from '../store'
import { formatMoney, formatAmount, todayISO } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'

const SWATCHES = ['#f4a5a5', '#f5d76e', '#8ed99a', '#7fdbca', '#c9b8f0', '#9ec5f0', '#f2c6dd', '#d0c4b0']
const EMOJIS = ['🚬', '🥤', '🌿', '🍺', '☕', '🍫', '🎰', '🍔']

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000)
}

export default function Habits({ onClose }: { onClose: () => void }) {
  const { habits, habitEntries, saveHabit, removeHabit, logHabitBuy, resistHabit, caixinhas } = useStore()
  const [editing, setEditing] = useState<Habit | null>(null)
  const [resisting, setResisting] = useState<Habit | null>(null)
  const [composite, setComposite] = useState(false)
  const today = todayISO()

  const stats = useMemo(() => {
    const by: Record<string, { spent: number; units: number; lastBuy?: string; firstBuy?: string; annual: number }> = {}
    for (const h of habits) by[h.id] = { spent: 0, units: 0, annual: 0 }
    for (const e of habitEntries) {
      if (e.kind !== 'buy') continue
      const s = by[e.habitId]
      if (!s) continue
      s.spent += e.amount
      s.units += e.units
      if (!s.firstBuy || e.date < s.firstBuy) s.firstBuy = e.date
      if (!s.lastBuy || e.date > s.lastBuy) s.lastBuy = e.date
    }
    for (const id in by) {
      const s = by[id]
      if (s.firstBuy) {
        const days = Math.max(1, daysBetween(s.firstBuy, today) + 1)
        s.annual = (s.spent / days) * 365
      }
    }
    return by
  }, [habits, habitEntries, today])

  function newHabit() {
    playClick()
    setEditing({ id: crypto.randomUUID(), name: '', icon: '🚬', color: SWATCHES[0], unitPrice: 0, order: habits.length })
  }

  async function quickBuy(h: Habit) {
    playClick()
    await logHabitBuy([{ habitId: h.id, units: 1 }], today)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">Fechar</button>
        <span className="text-lg font-semibold">Hábitos</span>
        <button onClick={newHabit} className="text-base font-semibold text-brand-400">+ Novo</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <p className="mb-3 px-1 text-xs text-neutral-500">
          Experimental · rastreio de vícios separado do orçamento.
        </p>

        {habits.length === 0 ? (
          <div className="mt-14 px-6 text-center text-neutral-500">
            <div className="text-4xl">🚬</div>
            <p className="mt-3 text-[15px] font-medium text-neutral-300">Nenhum hábito ainda</p>
            <p className="mt-1 text-sm">Crie um (Coca, cigarro…) com preço de referência pra ver o contador, projeção anual e streak.</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => { playClick(); setComposite(true) }}
              className="mb-3 w-full rounded-2xl bg-ink-soft py-2.5 text-sm font-semibold text-brand-400 active:bg-ink-muted"
            >
              🧾 Compra composta (dividir entre hábitos)
            </button>
            <div className="space-y-2">
              {habits.map((h) => {
                const s = stats[h.id] ?? { spent: 0, units: 0, annual: 0 }
                const streak = s.lastBuy ? daysBetween(s.lastBuy, today) : null
                return (
                  <div key={h.id} className="rounded-card bg-ink-soft p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { playClick(); setEditing(h) }} className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-xl" style={{ background: h.color + '33' }}>
                        {h.icon}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[15px] font-medium text-white">{h.name}</span>
                          <span className="tnum text-lg font-bold text-white">{formatMoney(s.spent)}</span>
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between text-xs text-neutral-500">
                          <span>{s.units} un · {formatMoney(h.unitPrice)}/un</span>
                          <span>~{formatMoney(s.annual)}/ano</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-semibold ${streak === null ? 'text-neutral-600' : streak >= 1 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        {streak === null ? 'sem compras' : streak === 0 ? 'comprou hoje' : `🔥 ${streak} dia${streak > 1 ? 's' : ''} limpo`}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { playClick(); setResisting(h) }} className="rounded-xl bg-ink-muted px-3 py-1.5 text-sm font-semibold text-emerald-400">Resisti</button>
                        <button onClick={() => quickBuy(h)} className="rounded-xl bg-ink-muted px-3 py-1.5 text-sm font-semibold text-white">+1 comprei</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {editing && (
        <HabitEditor
          draft={editing}
          isNew={!habits.some((h) => h.id === editing.id)}
          caixinhas={caixinhas}
          onClose={() => setEditing(null)}
          onSave={async (h) => { await saveHabit(h); setEditing(null) }}
          onDelete={async (id) => { await removeHabit(id); setEditing(null) }}
        />
      )}

      {resisting && (
        <UnitSheet
          habit={resisting}
          title={`Resisti — ${resisting.name}`}
          hint="Vira um lembrete pra transferir esse valor pra caixinha (resistência)."
          cta="Registrar resistência"
          onClose={() => setResisting(null)}
          onConfirm={async (units) => { await resistHabit(resisting.id, units, today); playConfirm(); setResisting(null) }}
        />
      )}

      {composite && (
        <CompositeSheet
          habits={habits}
          onClose={() => setComposite(false)}
          onConfirm={async (items) => { await logHabitBuy(items, today); playConfirm(); setComposite(false) }}
        />
      )}
    </div>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="grid h-9 w-9 place-items-center rounded-full bg-ink-muted text-xl text-white">−</button>
      <span className="tnum w-8 text-center text-lg font-bold text-white">{value}</span>
      <button onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-ink-muted text-xl text-white">+</button>
    </div>
  )
}

function UnitSheet({
  habit, title, hint, cta, onClose, onConfirm,
}: {
  habit: Habit
  title: string
  hint: string
  cta: string
  onClose: () => void
  onConfirm: (units: number) => void
}) {
  const [units, setUnits] = useState(1)
  const amount = Math.round(units * habit.unitPrice * 100) / 100
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mb-4 text-sm text-neutral-500">{hint}</p>
        <div className="flex items-center justify-between rounded-2xl bg-ink-muted px-4 py-3">
          <Stepper value={units} onChange={setUnits} />
          <span className="tnum text-xl font-bold text-brand-400">{formatMoney(amount)}</span>
        </div>
        <button onClick={() => units > 0 && onConfirm(units)} disabled={units <= 0}
          className={`mt-4 w-full rounded-2xl py-4 text-base font-bold ${units > 0 ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          {cta}
        </button>
      </div>
    </div>
  )
}

function CompositeSheet({ habits, onClose, onConfirm }: { habits: Habit[]; onClose: () => void; onConfirm: (items: { habitId: string; units: number }[]) => void }) {
  const [units, setUnits] = useState<Record<string, number>>({})
  const total = habits.reduce((s, h) => s + (units[h.id] ?? 0) * h.unitPrice, 0)
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">Compra composta</h3>
        <p className="mb-4 text-sm text-neutral-500">Quantas unidades de cada, numa compra só.</p>
        <div className="space-y-2">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-ink-muted px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full text-base" style={{ background: h.color + '33' }}>{h.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-white">{h.name}</span>
              <Stepper value={units[h.id] ?? 0} onChange={(v) => setUnits((u) => ({ ...u, [h.id]: v }))} />
            </div>
          ))}
        </div>
        <button onClick={() => total > 0 && onConfirm(habits.map((h) => ({ habitId: h.id, units: units[h.id] ?? 0 })))}
          disabled={total <= 0}
          className={`mt-4 w-full rounded-2xl py-4 text-base font-bold ${total > 0 ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          Registrar {formatAmount(total)}
        </button>
      </div>
    </div>
  )
}

function HabitEditor({
  draft, isNew, caixinhas, onClose, onSave, onDelete,
}: {
  draft: Habit
  isNew: boolean
  caixinhas: { id: string; name: string; icon: string }[]
  onClose: () => void
  onSave: (h: Habit) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(draft.name)
  const [icon, setIcon] = useState(draft.icon)
  const [color, setColor] = useState(draft.color)
  const [priceRaw, setPriceRaw] = useState(draft.unitPrice ? draft.unitPrice.toFixed(2).replace('.', ',') : '')
  const [caixinhaId, setCaixinhaId] = useState(draft.caixinhaId ?? '')
  const canSave = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <div className="mb-4 flex justify-center">
          <span className="grid h-16 w-16 place-items-center rounded-full text-2xl" style={{ background: color }}>{icon}</span>
        </div>
        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Coca-Cola"
          className="mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3.5 text-base text-white outline-none focus:ring-2 focus:ring-brand-500" />

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Ícone</label>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setIcon(e)} className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-xl ${icon === e ? 'bg-brand-500' : 'bg-ink-muted'}`}>{e}</button>
          ))}
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Cor</label>
        <div className="mb-4 flex gap-2">
          {SWATCHES.map((s) => (
            <button key={s} onClick={() => setColor(s)} className="h-8 w-8 rounded-full" style={{ background: s, boxShadow: color === s ? `0 0 0 2px #16181c, 0 0 0 4px ${s}` : 'none' }} />
          ))}
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Preço por unidade (R$)</label>
        <input value={priceRaw} onChange={(e) => setPriceRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
          className="tnum mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3 text-right text-lg font-bold text-white outline-none focus:ring-2 focus:ring-brand-500" />

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Caixinha de resistência (opcional)</label>
        <select value={caixinhaId} onChange={(e) => setCaixinhaId(e.target.value)}
          className="mb-5 w-full rounded-2xl bg-ink-muted px-4 py-3 text-[15px] text-white outline-none">
          <option value="">Nenhuma</option>
          {caixinhas.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        <button onClick={() => onSave({ ...draft, name: name.trim(), icon, color, unitPrice: parseNum(priceRaw), caixinhaId: caixinhaId || undefined })}
          disabled={!canSave}
          className={`w-full rounded-2xl py-4 text-base font-bold ${canSave ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          {isNew ? 'Criar hábito' : 'Salvar'}
        </button>
        {!isNew && (
          <button onClick={() => { if (window.confirm(`Excluir o hábito "${draft.name}"?`)) onDelete(draft.id) }}
            className="mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-rose-400 active:bg-ink-muted">
            Excluir hábito
          </button>
        )}
      </div>
    </div>
  )
}
