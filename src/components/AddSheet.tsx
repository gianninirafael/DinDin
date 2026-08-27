import { useMemo, useState } from 'react'
import type { TxKind } from '../types'
import { DEFAULT_CATEGORIES } from '../data/categories'
import { useStore } from '../store'
import { formatAmount, todayISO } from '../lib/format'

const KIND_TABS: { key: TxKind; label: string }[] = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
  { key: 'transfer', label: 'Transferência' },
]

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'back']

export default function AddSheet({ onClose }: { onClose: () => void }) {
  const addTransaction = useStore((s) => s.addTransaction)
  const [kind, setKind] = useState<TxKind>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [raw, setRaw] = useState('0')
  const [note, setNote] = useState('')
  const [date] = useState(todayISO())

  const categories = useMemo(
    () => DEFAULT_CATEGORIES.filter((c) => c.kind === kind || c.kind === 'both'),
    [kind],
  )

  const amount = parseFloat(raw.replace('.', '').replace(',', '.')) || 0

  function press(key: string) {
    setRaw((prev) => {
      if (key === 'back') return prev.length <= 1 ? '0' : prev.slice(0, -1)
      if (key === ',') return prev.includes(',') ? prev : prev + ','
      // limit to 2 decimals
      if (prev.includes(',') && prev.split(',')[1]?.length >= 2) return prev
      if (prev === '0' && key !== ',') return key
      return prev + key
    })
  }

  async function confirm() {
    if (amount <= 0 || !categoryId) return
    await addTransaction({ kind, amount, categoryId, note: note.trim() || undefined, date })
    onClose()
  }

  const canSave = amount > 0 && !!categoryId

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">
          Cancelar
        </button>
        <span className="text-lg font-semibold">Adicionar</span>
        <span className="w-16" />
      </div>

      {/* Kind tabs */}
      <div className="mx-4 mb-4 flex rounded-full bg-neutral-800/70 p-1 text-sm font-medium">
        {KIND_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setKind(t.key)
              setCategoryId(null)
            }}
            className={`flex-1 truncate rounded-full py-2 transition ${
              kind === t.key ? 'bg-white text-neutral-900' : 'text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-4 gap-x-3 gap-y-5 pb-2">
          {categories.map((c) => {
            const active = c.id === categoryId
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className="grid h-16 w-16 place-items-center rounded-full text-2xl transition"
                  style={{
                    background: active ? c.color : 'rgba(255,255,255,0.06)',
                    boxShadow: active ? `0 0 0 3px ${c.color}55` : 'none',
                  }}
                >
                  {c.icon}
                </span>
                <span className="line-clamp-1 text-center text-xs text-neutral-300">
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div className="px-6 pb-2 pt-3 text-right">
        <span className="tnum text-5xl font-bold tracking-tight">{formatAmount(amount)}</span>
      </div>

      {/* Note */}
      <div className="px-4 pb-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota :  Insira uma nota…"
          className="w-full rounded-2xl bg-neutral-800/70 px-4 py-3.5 text-base text-white placeholder:text-neutral-500 outline-none"
        />
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2 px-3 pb-6">
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className="rounded-2xl bg-neutral-800/70 py-4 text-2xl font-medium active:bg-neutral-700"
            >
              {k === 'back' ? '⌫' : k}
            </button>
          ))}
        </div>
        <div className="grid grid-rows-4 gap-2">
          <button className="row-span-1 rounded-2xl bg-neutral-800/70 py-3 text-sm text-brand-400">
            Hoje
          </button>
          <button
            onClick={confirm}
            disabled={!canSave}
            className={`row-span-3 rounded-2xl text-2xl font-semibold transition ${
              canSave ? 'bg-brand-500 text-white' : 'bg-neutral-800/50 text-neutral-600'
            }`}
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}
