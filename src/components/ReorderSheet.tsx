import { useMemo } from 'react'
import type { TxKind } from '../types'
import { useStore } from '../store'

export default function ReorderSheet({
  kind,
  onClose,
}: {
  kind: TxKind
  onClose: () => void
}) {
  const { categories, moveCategory } = useStore()

  const list = useMemo(
    () =>
      categories
        .filter((c) => c.kind === kind || c.kind === 'both')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories, kind],
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-white">Reordenar categorias</h3>
          <button onClick={onClose} className="text-sm font-semibold text-brand-400">
            Concluir
          </button>
        </div>

        <div className="space-y-2">
          {list.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl bg-ink-muted px-3 py-2.5"
            >
              <span
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-base"
                style={{ background: c.color + '33' }}
              >
                {c.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">
                {c.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveCategory(kind, c.id, -1)}
                  disabled={i === 0}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lg text-white disabled:opacity-25"
                  aria-label="Mover para cima"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveCategory(kind, c.id, 1)}
                  disabled={i === list.length - 1}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lg text-white disabled:opacity-25"
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
