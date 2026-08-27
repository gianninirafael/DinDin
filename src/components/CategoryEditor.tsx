import { useState } from 'react'
import type { Category, TxKind } from '../types'
import { useStore } from '../store'

const SWATCHES = [
  '#f4a5a5', '#f2b8c6', '#f5d76e', '#7fdbca', '#f6cbb0', '#8ed99a',
  '#9ec5f0', '#f5c96b', '#c9b8f0', '#a5d8f4', '#f0a5a5', '#b8e0d2',
  '#f4d19b', '#f2c6dd', '#a5c9f4', '#c6d2dd', '#d0c4b0', '#ffcc33',
]

const QUICK_EMOJI = ['🍔', '☕', '🍺', '🛒', '⛽', '🚗', '🏠', '💊', '🎮', '🎁', '✈️', '📱', '💡', '🏋️', '🐶', '💰', '💸', '📈']

const KIND_OPTS: { key: TxKind | 'both'; label: string }[] = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
  { key: 'both', label: 'Ambos' },
]

export default function CategoryEditor({
  category,
  defaultKind,
  onClose,
}: {
  category: Category | null
  defaultKind: TxKind
  onClose: () => void
}) {
  const { categories, saveCategory, removeCategory } = useStore()
  const [label, setLabel] = useState(category?.label ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '🏷️')
  const [color, setColor] = useState(category?.color ?? SWATCHES[0])
  const [kind, setKind] = useState<TxKind | 'both'>(category?.kind ?? defaultKind)

  const isEdit = !!category
  const canSave = label.trim().length > 0 && icon.trim().length > 0

  async function save() {
    if (!canSave) return
    const nextOrder = Math.max(0, ...categories.map((c) => c.order ?? 0)) + 1
    const cat: Category = {
      id: category?.id ?? crypto.randomUUID(),
      label: label.trim(),
      icon: icon.trim(),
      color,
      kind,
      order: category?.order ?? nextOrder,
    }
    await saveCategory(cat)
    onClose()
  }

  async function remove() {
    if (!category) return
    if (confirm(`Excluir a categoria "${category.label}"? As transações antigas ficarão sem categoria.`)) {
      await removeCategory(category.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-ink-line" />

        {/* Preview */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <span
            className="grid h-20 w-20 place-items-center rounded-full text-3xl"
            style={{ background: color }}
          >
            {icon || '🏷️'}
          </span>
          <span className="text-sm text-neutral-400">{label || 'Nova categoria'}</span>
        </div>

        {/* Name */}
        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Nome</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: Mercado"
          className="mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3.5 text-base text-white placeholder:text-neutral-600 outline-none focus:ring-2 focus:ring-brand-500"
        />

        {/* Icon */}
        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Ícone (emoji)</label>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
          className="mb-2 w-full rounded-2xl bg-ink-muted px-4 py-3 text-center text-2xl outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-ink-muted text-xl active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color */}
        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Cor</label>
        <div className="mb-4 grid grid-cols-9 gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s}
              onClick={() => setColor(s)}
              className="aspect-square rounded-full transition"
              style={{
                background: s,
                boxShadow: color === s ? '0 0 0 3px #16181c, 0 0 0 5px ' + s : 'none',
              }}
            />
          ))}
        </div>

        {/* Kind */}
        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Tipo</label>
        <div className="mb-6 flex rounded-full bg-ink-muted p-1 text-sm font-medium">
          {KIND_OPTS.map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={`flex-1 rounded-full py-2 transition ${
                kind === k.key ? 'bg-white text-neutral-900' : 'text-neutral-300'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={save}
          disabled={!canSave}
          className={`w-full rounded-2xl py-4 text-base font-bold transition ${
            canSave ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'
          }`}
        >
          {isEdit ? 'Salvar alterações' : 'Criar categoria'}
        </button>
        {isEdit && (
          <button
            onClick={remove}
            className="mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-rose-400 active:bg-ink-muted"
          >
            Excluir categoria
          </button>
        )}
      </div>
    </div>
  )
}
