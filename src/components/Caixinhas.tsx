import { useState } from 'react'
import type { Caixinha, CaixinhaType } from '../types'
import { useStore } from '../store'
import { formatMoney, formatAmount, formatDMY } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'

const SWATCHES = ['#7fdbca', '#f5d76e', '#8ed99a', '#9ec5f0', '#f2c6dd', '#c9b8f0', '#f4a5a5', '#ffcc33']
const EMOJIS = ['🐷', '💰', '🎯', '✈️', '🏠', '🚗', '🎁', '🛟', '📦', '💊', '🎓', '💻']
const TYPES: { key: CaixinhaType; label: string; hint: string }[] = [
  { key: 'acumulativa', label: 'Poupança', hint: 'Só cresce, sem alvo' },
  { key: 'alvo_fixo', label: 'Alvo fixo', hint: 'Repor até um valor' },
  { key: 'meta_com_prazo', label: 'Meta c/ prazo', hint: 'Valor até uma data' },
]

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

export default function Caixinhas({ onClose }: { onClose: () => void }) {
  const { caixinhas, saveCaixinha, removeCaixinha, depositToCaixinha, createPendencia } = useStore()
  const [editing, setEditing] = useState<Caixinha | null>(null) // editor open (existing or draft)
  const [managing, setManaging] = useState<Caixinha | null>(null) // deposit sheet

  function newCaixinha() {
    playClick()
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      icon: '🐷',
      color: SWATCHES[0],
      type: 'acumulativa',
      balance: 0,
      order: caixinhas.length,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">Fechar</button>
        <span className="text-lg font-semibold">Caixinhas</span>
        <button onClick={newCaixinha} className="text-base font-semibold text-brand-400">+ Nova</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {caixinhas.length === 0 && (
          <div className="mt-16 px-6 text-center text-neutral-500">
            <div className="text-4xl">🐷</div>
            <p className="mt-3 text-[15px] font-medium text-neutral-300">Nenhuma caixinha ainda</p>
            <p className="mt-1 text-sm">Crie uma pra guardar sobra, uma meta, ou o que resistiu de gastar.</p>
          </div>
        )}

        <div className="space-y-2">
          {caixinhas.map((c) => {
            const hasTarget = (c.type === 'alvo_fixo' || c.type === 'meta_com_prazo') && !!c.target
            const pct = hasTarget ? Math.min(100, Math.round((c.balance / (c.target as number)) * 100)) : 0
            return (
              <button
                key={c.id}
                onClick={() => { playClick(); setManaging(c) }}
                className="block w-full rounded-card bg-ink-soft p-4 text-left active:bg-ink-muted"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-xl" style={{ background: c.color + '33' }}>
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-medium text-white">{c.name}</span>
                      <span className="tnum text-lg font-bold text-brand-400">{formatMoney(c.balance)}</span>
                    </div>
                    {hasTarget && (
                      <div className="mt-0.5 flex items-baseline justify-between text-xs text-neutral-500">
                        <span>de {formatAmount(c.target as number)}</span>
                        {c.deadline && <span>até {formatDMY(c.deadline)}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {hasTarget && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {editing && (
        <CaixinhaEditor
          draft={editing}
          isNew={!caixinhas.some((c) => c.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={async (c) => { await saveCaixinha(c); setEditing(null) }}
          onDelete={async (id) => { await removeCaixinha(id); setEditing(null) }}
        />
      )}

      {managing && (
        <DepositSheet
          caixinha={managing}
          onClose={() => setManaging(null)}
          onDepositNow={async (amt) => { await depositToCaixinha(managing.id, amt); playConfirm(); setManaging(null) }}
          onDepositLater={async (amt) => {
            await createPendencia({ caixinhaId: managing.id, amount: amt, origin: 'sobra', note: `Guardar em ${managing.name}` })
            playConfirm(); setManaging(null)
          }}
          onEdit={() => { setEditing(managing); setManaging(null) }}
        />
      )}
    </div>
  )
}

function CaixinhaEditor({
  draft, isNew, onClose, onSave, onDelete,
}: {
  draft: Caixinha
  isNew: boolean
  onClose: () => void
  onSave: (c: Caixinha) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(draft.name)
  const [icon, setIcon] = useState(draft.icon)
  const [color, setColor] = useState(draft.color)
  const [type, setType] = useState<CaixinhaType>(draft.type)
  const [targetRaw, setTargetRaw] = useState(draft.target ? draft.target.toFixed(2).replace('.', ',') : '')
  const [deadline, setDeadline] = useState(draft.deadline ?? '')

  const showTarget = type === 'alvo_fixo' || type === 'meta_com_prazo'
  const canSave = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />

        <div className="mb-4 flex flex-col items-center gap-2">
          <span className="grid h-16 w-16 place-items-center rounded-full text-2xl" style={{ background: color }}>{icon}</span>
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem"
          className="mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3.5 text-base text-white outline-none focus:ring-2 focus:ring-brand-500" />

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Ícone</label>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setIcon(e)}
              className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-xl ${icon === e ? 'bg-brand-500' : 'bg-ink-muted'}`}>{e}</button>
          ))}
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Cor</label>
        <div className="mb-4 flex gap-2">
          {SWATCHES.map((s) => (
            <button key={s} onClick={() => setColor(s)} className="h-8 w-8 rounded-full"
              style={{ background: s, boxShadow: color === s ? `0 0 0 2px #16181c, 0 0 0 4px ${s}` : 'none' }} />
          ))}
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Tipo</label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`rounded-2xl px-2 py-2 text-center ${type === t.key ? 'bg-white text-neutral-900' : 'bg-ink-muted text-neutral-300'}`}>
              <span className="block text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {showTarget && (
          <>
            <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Alvo (R$)</label>
            <input value={targetRaw} onChange={(e) => setTargetRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
              className="tnum mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3 text-right text-lg font-bold text-white outline-none focus:ring-2 focus:ring-brand-500" />
          </>
        )}
        {type === 'meta_com_prazo' && (
          <>
            <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Prazo</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="mb-4 w-full rounded-2xl bg-ink-muted px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-brand-500" />
          </>
        )}

        <button
          onClick={() => onSave({
            ...draft, name: name.trim(), icon, color, type,
            target: showTarget ? parseNum(targetRaw) || undefined : undefined,
            deadline: type === 'meta_com_prazo' && deadline ? deadline : undefined,
          })}
          disabled={!canSave}
          className={`w-full rounded-2xl py-4 text-base font-bold ${canSave ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          {isNew ? 'Criar caixinha' : 'Salvar'}
        </button>
        {!isNew && (
          <button onClick={() => { if (window.confirm(`Excluir a caixinha "${draft.name}"?`)) onDelete(draft.id) }}
            className="mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-rose-400 active:bg-ink-muted">
            Excluir caixinha
          </button>
        )}
      </div>
    </div>
  )
}

function DepositSheet({
  caixinha, onClose, onDepositNow, onDepositLater, onEdit,
}: {
  caixinha: Caixinha
  onClose: () => void
  onDepositNow: (amt: number) => void
  onDepositLater: (amt: number) => void
  onEdit: () => void
}) {
  const [raw, setRaw] = useState('')
  const amt = parseNum(raw)

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full text-base" style={{ background: caixinha.color + '33' }}>{caixinha.icon}</span>
            <span className="text-lg font-semibold text-white">{caixinha.name}</span>
          </div>
          <span className="tnum text-lg font-bold text-brand-400">{formatMoney(caixinha.balance)}</span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-ink-muted px-4">
          <span className="text-lg font-semibold text-neutral-500">R$</span>
          <input autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
            className="tnum w-full bg-transparent py-3.5 text-right text-2xl font-bold text-white outline-none placeholder:text-neutral-600" />
        </div>

        <button onClick={() => amt > 0 && onDepositNow(amt)} disabled={amt <= 0}
          className={`mt-4 w-full rounded-2xl py-4 text-base font-bold ${amt > 0 ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          Guardar agora
        </button>
        <button onClick={() => amt > 0 && onDepositLater(amt)} disabled={amt <= 0}
          className={`mt-2 w-full rounded-2xl border border-ink-line py-3.5 text-base font-semibold ${amt > 0 ? 'text-white' : 'text-neutral-600'}`}>
          Guardar depois (lembrete)
        </button>
        <p className="mt-2 text-center text-xs text-neutral-600">
          "Depois" cria um lembrete fixo na tela até você confirmar a transferência de verdade.
        </p>

        <button onClick={onEdit} className="mt-3 w-full py-2 text-center text-sm text-neutral-400">Editar caixinha</button>
      </div>
    </div>
  )
}
