import { useMemo, useRef, useState } from 'react'
import type { TxKind, Transaction, Category } from '../types'
import { useStore } from '../store'
import { formatAmount, formatDMY, isToday } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'
import CategoryEditor from './CategoryEditor'
import ReorderSheet from './ReorderSheet'

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
  const { addTransaction, updateTransaction, removeTransaction, createPendencia, categories, lastDate } =
    useStore()
  const isEdit = !!editing

  const [kind, setKind] = useState<TxKind>(editing?.kind ?? 'expense')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [raw, setRaw] = useState(editing ? amountToRaw(editing.amount) : '0')
  const [note, setNote] = useState(editing?.note ?? '')
  const [date, setDate] = useState(editing?.date ?? lastDate)
  const [reimbursable, setReimbursable] = useState(editing?.reimbursable ?? false)

  const [manageMode, setManageMode] = useState(false)
  const [catEditorOpen, setCatEditorOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [reorderOpen, setReorderOpen] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function openDatePicker() {
    const el = dateInputRef.current
    if (!el) return
    // showPicker() is the reliable way to pop the native calendar on tap
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  const visibleCats = useMemo(
    () => categories.filter((c) => c.kind === kind || c.kind === 'both'),
    [categories, kind],
  )

  const amount = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0

  function press(key: string) {
    playClick()
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
    const isReimb = kind === 'expense' && reimbursable
    if (isEdit && editing) {
      await updateTransaction({
        ...editing, kind, amount, categoryId, note: note.trim() || undefined, date,
        reimbursable: isReimb || undefined,
      })
    } else {
      const id = await addTransaction({
        kind, amount, categoryId, note: note.trim() || undefined, date,
        reimbursable: isReimb || undefined,
      })
      if (isReimb) {
        await createPendencia({
          origin: 'reembolso',
          transactionId: id,
          amount,
          note: note.trim() || categories.find((c) => c.id === categoryId)?.label,
        })
      }
    }
    playConfirm()
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
    playClick()
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
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
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
      <div className="mx-4 mb-3 flex rounded-full bg-neutral-800/70 p-1 text-sm font-medium">
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
        <div className="mb-2 flex items-center justify-between px-5">
          <p className="text-xs text-brand-400">
            Toque para editar, ou + para criar uma nova.
          </p>
          <button
            onClick={() => setReorderOpen(true)}
            className="rounded-full bg-ink-muted px-3 py-1 text-xs font-medium text-white"
          >
            ↕ Reordenar
          </button>
        </div>
      )}

      {/* Category grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 pb-2">
          {visibleCats.map((c) => {
            const active = c.id === categoryId && !manageMode
            return (
              <button
                key={c.id}
                onClick={() => tapCategory(c)}
                className="relative flex flex-col items-center gap-1.5"
              >
                <span
                  className="grid h-[52px] w-[52px] place-items-center rounded-full text-xl transition"
                  style={{
                    background: active ? c.color : 'rgba(255,255,255,0.06)',
                    boxShadow: active ? `0 0 0 3px ${c.color}55` : 'none',
                  }}
                >
                  {c.icon}
                </span>
                {manageMode && (
                  <span className="absolute right-1.5 top-0 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] text-black">
                    ✏️
                  </span>
                )}
                <span className="line-clamp-1 text-center text-[11px] text-neutral-300">
                  {c.label}
                </span>
              </button>
            )
          })}

          {/* Add-category tile */}
          <button onClick={openNewCategory} className="flex flex-col items-center gap-1.5">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-neutral-600 text-xl text-neutral-400">
              +
            </span>
            <span className="line-clamp-1 text-center text-[11px] text-neutral-500">Nova</span>
          </button>
        </div>
      </div>

      {/* Amount */}
      <div className="px-6 pb-1 pt-2 text-right">
        <span
          className={`tnum text-[2.75rem] font-extrabold leading-none tracking-tight ${
            amount > 0 ? 'text-white' : 'text-neutral-600'
          }`}
        >
          {formatAmount(amount)}
        </span>
      </div>

      {/* Note */}
      <div className="px-4 pb-2 pt-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota :  Insira uma nota…"
          className="w-full rounded-2xl bg-neutral-800/70 px-4 py-3 text-base text-white placeholder:text-neutral-500 outline-none"
        />
        {kind === 'expense' && (
          <button
            onClick={() => setReimbursable((v) => !v)}
            className={`mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left ${
              reimbursable ? 'bg-brand-500/15' : 'bg-neutral-800/70'
            }`}
          >
            <span className={`text-sm font-medium ${reimbursable ? 'text-brand-400' : 'text-neutral-300'}`}>
              ↩︎ Reembolsável
            </span>
            <span className={`relative h-5 w-9 rounded-full transition ${reimbursable ? 'bg-brand-500' : 'bg-ink-line'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${reimbursable ? 'left-[1.125rem]' : 'left-0.5'}`} />
            </span>
          </button>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className="rounded-2xl bg-neutral-800/70 py-3 text-xl font-medium active:bg-neutral-700"
            >
              {k === 'back' ? '⌫' : k}
            </button>
          ))}
        </div>
        <div className="grid grid-rows-4 gap-2">
          <button
            onClick={openDatePicker}
            className="row-span-1 flex flex-col items-center justify-center rounded-2xl bg-neutral-800/70 py-1 text-brand-400"
          >
            <span className="text-[11px] leading-tight">📅 {isToday(date) ? 'Hoje' : 'Data'}</span>
            <span className="tnum text-[11px] font-semibold leading-tight text-neutral-300">
              {formatDMY(date)}
            </span>
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

      {/* Hidden native date input (opened via the Data button) */}
      <input
        ref={dateInputRef}
        type="date"
        value={date}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
      />

      {catEditorOpen && (
        <CategoryEditor
          category={editingCat}
          defaultKind={kind}
          onClose={() => setCatEditorOpen(false)}
        />
      )}

      {reorderOpen && <ReorderSheet kind={kind} onClose={() => setReorderOpen(false)} />}
    </div>
  )
}
