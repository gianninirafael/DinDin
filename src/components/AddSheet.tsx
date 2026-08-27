import { useMemo, useState } from 'react'
import type { TxKind, Transaction, Category } from '../types'
import { useStore } from '../store'
import { formatAmount, todayISO } from '../lib/format'
import CategoryEditor from './CategoryEditor'

const KIND_TABS: { key: TxKind; label: string }[] = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
  { key: 'transfer', label: 'Transferência' },
]

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'back']

function amountToRaw(n: number): string {
  if (!n) return '0'
  return n.toString().replace('.', ',')
}

export default function AddSheet({
  editing,
  onClose,
}: {
  editing?: Transaction | null
  onClose: () => void
}) {
  const { addTransaction, updateTransaction, removeTransaction, categories } = useStore()
  const isEdit = !!editing

  const [kind, setKind] = useState<TxKind>(editing?.kind ?? 'expense')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [raw, setRaw] = useState(editing ? amountToRaw(editing.amount) : '0')
  const [note, setNote] = useState(editing?.note ?? '')
  const [date] = useState(editing?.date ?? todayISO())

  const [manageMode, setManageMode] = useState(false)
  const [catEditorOpen, setCatEditorOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const visibleCats = useMemo(
    () => categories.filter((c) => c.kind === kind || c.kind === 'both'),
    [categories, kind],
  )

  const amount = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0

  function press(key: string) {
    setRaw((prev) => {
      if (key === 'back') return prev.length <= 1 ? '0' : prev.slice(0, -1)
      if (key === ',') return prev.includes(',') ? prev : prev + ','
      if (prev.includes(',') && prev.split(',')[1]?.length >= 2) return prev
      if (prev === '0' && key !== ',') return key
      return prev + key
    })
  }

  async function handleSave() {
    if (amount <= 0 || !categoryId) return
    if (isEdit && editing) {
      await updateTransaction({ ...editing, kind, amount, categoryId, note: note.trim() || undefined, date })
    } else {
      await addTransaction({ kind, amount, categoryId, note: note.trim() || undefined, date })
    }
    onClose()
  }

  async function removeTx() {
    if (!editing) return
    if (window.confirm(`Excluir esta transação?`)) {
      await removeTransaction(editing.id)
      onClose()
    }
  }

  function openNewCategory() {
    setEditingCat(null)
    setCatEditorOpen(true)
  }

  function tapCategory(c: Category) {
    if (manageMode) {
      setEditingCat(c)
      setCatEditorOpen(true)
    } else {
      setCategoryId(c.id)
    }
  }

  const canSave = amount > 0 && !!categoryId

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">
          Cancelar
        </button>
        <span className="text-lg font-semibold">{isEdit ? 'Editar' : 'Adicionar'}</span>
        {isEdit ? (
          <button onClick={removeTx} className="text-base text-rose-400">
            Excluir
          </button>
        ) : (
          <button
            onClick={() => setManageMode((m) => !m)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              manageMode ? 'bg-brand-500 text-black' : 'text-neutral-300'
            }`}
          >
            {manageMode ? 'Concluir' : 'Editar'}
          </button>
        )}
      </div>

      {/* Kind tabs */}
      <div className="mx-4 mb-4 flex rounded-full bg-neutral-800/70 p-1 text-sm font-medium">
        {KIND_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setKind(t.key)
              setManageMode(false)
            }}
            className={`flex-1 truncate rounded-full py-2 transition ${
              kind === t.key ? 'bg-white text-neutral-900' : 'text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {manageMode && (
        <p className="mb-2 px-5 text-xs text-brand-400">
          Toque em uma categoria para editar, ou em + para criar uma nova.
        </p>
      )}

      {/* Category grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-4 gap-x-3 gap-y-5 pb-2">
          {visibleCats.map((c) => {
            const active = c.id === categoryId && !manageMode
            return (
              <button
                key={c.id}
                onClick={() => tapCategory(c)}
                className="relative flex flex-col items-center gap-2"
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
                {manageMode && (
                  <span className="absolute right-3 top-0 grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs text-black">
                    ✏️
                  </span>
                )}
                <span className="line-clamp-1 text-center text-xs text-neutral-300">
                  {c.label}
                </span>
              </button>
            )
          })}

          {/* Add-category tile */}
          <button onClick={openNewCategory} className="flex flex-col items-center gap-2">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-dashed border-neutral-600 text-2xl text-neutral-400">
              +
            </span>
            <span className="line-clamp-1 text-center text-xs text-neutral-500">Nova</span>
          </button>
        </div>
      </div>

      {/* Amount */}
      <div className="px-6 pb-2 pt-3 text-right">
        <span
          className={`tnum text-6xl font-extrabold tracking-tight ${
            amount > 0 ? 'text-white' : 'text-neutral-600'
          }`}
        >
          {formatAmount(amount)}
        </span>
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
            onClick={handleSave}
            disabled={!canSave}
            className={`row-span-3 rounded-2xl text-2xl font-bold transition ${
              canSave ? 'bg-brand-500 text-black' : 'bg-neutral-800/50 text-neutral-600'
            }`}
          >
            ✓
          </button>
        </div>
      </div>

      {catEditorOpen && (
        <CategoryEditor
          category={editingCat}
          defaultKind={kind}
          onClose={() => setCatEditorOpen(false)}
        />
      )}
    </div>
  )
}
