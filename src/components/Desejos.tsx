import { useEffect, useMemo, useState } from 'react'
import { useStore, monthImpulse, monthTransactions } from '../store'
import { formatMoney, formatAmount } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

/** "2h30", "45min", "8h" — an amount expressed as work time. */
function workTime(amount: number, rate: number): string | null {
  if (rate <= 0 || amount <= 0) return null
  const totalMin = Math.round((amount / rate) * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** "faltam 6h", "faltam 40min", or null when the pause is over. */
function pauseLeft(releaseAt: number, now: number): string | null {
  const ms = releaseAt - now
  if (ms <= 0) return null
  const totalMin = Math.ceil(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 1) return `faltam ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
  return `faltam ${m}min`
}

export default function Desejos({ onClose }: { onClose: () => void }) {
  const {
    desejos, transactions, activeMonth, hourlyRate, setHourlyRate,
    addDesejo, removeDesejo, decideDesejo,
  } = useStore()

  // tick every 30s so the pause countdowns stay live
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const [nameRaw, setNameRaw] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [rateOpen, setRateOpen] = useState(false)

  const impulso = useMemo(
    () => monthImpulse(monthTransactions(transactions, activeMonth), activeMonth),
    [transactions, activeMonth],
  )
  const abertos = desejos.filter((d) => d.status === 'aberto')
  const decididos = desejos.filter((d) => d.status !== 'aberto')
  const economizado = decididos
    .filter((d) => d.status === 'deixei_passar')
    .reduce((s, d) => s + d.amount, 0)

  const canAdd = nameRaw.trim().length > 0 && parseNum(amountRaw) > 0

  async function add() {
    if (!canAdd) return
    await addDesejo({ name: nameRaw.trim(), amount: parseNum(amountRaw) })
    playConfirm()
    setNameRaw('')
    setAmountRaw('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">Fechar</button>
        <span className="text-lg font-semibold">Desejos</span>
        <span className="w-12" />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-10">
        {/* Hero: saved by letting go */}
        <section className="rounded-card bg-ink-soft p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-neutral-500">Economizei deixando passar</div>
              <div className="tnum text-3xl font-extrabold text-emerald-400">{formatMoney(economizado)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500">Impulso este mês</div>
              <div className="tnum text-lg font-bold text-rose-400">{formatMoney(impulso)}</div>
            </div>
          </div>
          <button
            onClick={() => { playClick(); setRateOpen(true) }}
            className="mt-3 flex w-full items-center justify-between border-t border-ink-line pt-3 text-left"
          >
            <span className="text-xs text-neutral-500">Sua hora de trabalho vale</span>
            <span className="tnum text-sm font-semibold text-white">
              {hourlyRate > 0 ? `${formatMoney(hourlyRate)}/h` : 'definir'} <span className="text-neutral-600">✎</span>
            </span>
          </button>
        </section>

        {/* Add a desejo */}
        <section className="rounded-card bg-ink-soft p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-400">Quero comprar…</h3>
          <input
            value={nameRaw}
            onChange={(e) => setNameRaw(e.target.value)}
            placeholder="O que é? (ex.: fone novo)"
            className="mb-2 w-full rounded-2xl bg-ink-muted px-4 py-3 text-base text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <input
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="tnum min-w-0 flex-1 rounded-2xl bg-ink-muted px-4 py-3 text-right text-lg font-bold text-white outline-none placeholder:text-neutral-600"
            />
            <button
              onClick={add}
              disabled={!canAdd}
              className={`flex-shrink-0 rounded-2xl px-5 text-sm font-bold ${canAdd ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}
            >
              Adicionar
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            Fica em pausa de 24h. Se depois disso ainda quiser, decida com a cabeça fria.
          </p>
        </section>

        {/* Open desejos */}
        {abertos.length > 0 && (
          <section className="space-y-2">
            {abertos.map((d) => {
              const left = pauseLeft(d.releaseAt, now)
              const wt = workTime(d.amount, hourlyRate)
              return (
                <div key={d.id} className="rounded-card bg-ink-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-white">{d.name}</div>
                      <div className="tnum mt-0.5 text-sm text-neutral-400">
                        {formatMoney(d.amount)}
                        {wt && <span className="text-neutral-600"> · ≈ {wt} de trabalho</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (window.confirm(`Remover "${d.name}"?`)) removeDesejo(d.id) }}
                      className="flex-shrink-0 text-neutral-600 active:text-rose-400"
                      aria-label="Remover"
                    >
                      ✕
                    </button>
                  </div>
                  {left ? (
                    <div className="mt-3 rounded-xl bg-ink-muted px-3 py-2 text-center text-xs font-semibold text-brand-400">
                      ⏳ Em pausa — {left}
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { playClick(); decideDesejo(d.id, 'deixei_passar') }}
                        className="rounded-xl bg-emerald-500/15 py-2.5 text-sm font-bold text-emerald-400 active:bg-emerald-500/25"
                      >
                        Deixei passar
                      </button>
                      <button
                        onClick={() => { playClick(); decideDesejo(d.id, 'comprei') }}
                        className="rounded-xl bg-ink-muted py-2.5 text-sm font-bold text-neutral-300 active:bg-ink-line"
                      >
                        Comprei
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {abertos.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-neutral-500">
            Nada na espera. Da próxima vez que bater a vontade, jogue aqui antes de comprar.
          </p>
        )}

        {/* History */}
        {decididos.length > 0 && (
          <section className="rounded-card bg-ink-soft p-4">
            <h3 className="mb-2 text-sm font-semibold text-neutral-400">Histórico</h3>
            <div className="space-y-1.5">
              {decididos
                .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))
                .map((d) => (
                  <div key={d.id} className="flex items-center gap-2 py-1">
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-300">{d.name}</span>
                    <span className="tnum text-sm text-neutral-500">{formatAmount(d.amount)}</span>
                    <span
                      className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        d.status === 'deixei_passar' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {d.status === 'deixei_passar' ? 'deixei passar' : 'comprei'}
                    </span>
                    <button
                      onClick={() => removeDesejo(d.id)}
                      className="flex-shrink-0 text-neutral-700 active:text-rose-400"
                      aria-label="Remover"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {rateOpen && (
        <RateSheet
          initial={hourlyRate}
          onClose={() => setRateOpen(false)}
          onSave={(v) => { setHourlyRate(v); setRateOpen(false) }}
        />
      )}
    </div>
  )
}

function RateSheet({
  initial, onClose, onSave,
}: {
  initial: number
  onClose: () => void
  onSave: (v: number) => void
}) {
  const [raw, setRaw] = useState(initial ? initial.toFixed(2).replace('.', ',') : '')
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="text-lg font-semibold text-white">Quanto vale sua hora?</h3>
        <p className="mb-4 text-sm text-neutral-500">
          Pra ver cada compra em horas de trabalho. Some o que você fatura e divida pelas horas que trabalha.
        </p>
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
          <span className="text-lg font-semibold text-neutral-500">/h</span>
        </div>
        <button
          onClick={() => { playClick(); onSave(parseNum(raw)) }}
          className="mt-4 w-full rounded-2xl bg-brand-500 py-4 text-base font-bold text-black active:scale-[0.99]"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}
