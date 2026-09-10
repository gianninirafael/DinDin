import { useMemo, useState } from 'react'
import type { Account } from '../types'
import { useStore, accountBalance, netWorth } from '../store'
import { DEFAULT_ACCOUNT_ID } from '../lib/db'
import { formatAmount } from '../lib/format'
import { playClick } from '../lib/sound'

const SWATCHES = ['#facc15', '#7fdbca', '#9ec5f0', '#8ed99a', '#c9b8f0', '#f2c6dd', '#f4a5a5', '#f5d76e']
const EMOJIS = ['👛', '🏦', '💳', '💵', '🌐', '🪙', '🐷', '💼', '📊', '💰', '🧾', '🏧']

function parseSigned(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0
}

export default function Contas({ onClose }: { onClose: () => void }) {
  const { accounts, transactions, saveAccount, removeAccount } = useStore()
  const [editing, setEditing] = useState<Account | null>(null)

  const total = useMemo(() => netWorth(accounts, transactions), [accounts, transactions])
  const visible = accounts.filter((a) => !a.archived)

  function newAccount() {
    playClick()
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      icon: '🏦',
      color: SWATCHES[0],
      openingBalance: 0,
      order: accounts.length,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">Fechar</button>
        <span className="text-lg font-semibold">Contas</span>
        <button onClick={newAccount} className="text-base font-semibold text-brand-400">+ Nova</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {/* Net worth hero */}
        <div className="mb-4 rounded-card bg-ink-soft p-4">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">Patrimônio</p>
          <div className="mt-1 tnum text-4xl font-extrabold tracking-tight text-brand-400">
            {total < 0 ? '−' : ''}{formatAmount(total)}
            <span className="ml-1 text-base font-semibold text-neutral-500">BRL</span>
          </div>
          <p className="mt-1 text-xs text-neutral-600">Soma do saldo de todas as contas.</p>
        </div>

        <div className="space-y-2">
          {visible.map((a) => {
            const bal = accountBalance(a, transactions)
            return (
              <button
                key={a.id}
                onClick={() => { playClick(); setEditing(a) }}
                className="flex w-full items-center gap-3 rounded-card bg-ink-soft p-4 text-left active:bg-ink-muted"
              >
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-xl" style={{ background: a.color + '33' }}>
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-white">{a.name}</span>
                  {a.id === DEFAULT_ACCOUNT_ID && (
                    <span className="block text-xs text-neutral-600">conta padrão</span>
                  )}
                </span>
                <span className={`tnum text-lg font-bold ${bal < 0 ? 'text-rose-400' : 'text-white'}`}>
                  {bal < 0 ? '−' : ''}{formatAmount(bal)}
                </span>
              </button>
            )
          })}
        </div>

        <p className="px-2 pt-4 text-xs text-neutral-600">
          O saldo é o valor inicial + receitas − despesas + transferências recebidas. Transferências
          entre contas movem o dinheiro sem mexer no saldo total.
        </p>
      </div>

      {editing && (
        <AccountEditor
          draft={editing}
          isNew={!accounts.some((a) => a.id === editing.id)}
          isDefault={editing.id === DEFAULT_ACCOUNT_ID}
          onClose={() => setEditing(null)}
          onSave={async (a) => { await saveAccount(a); setEditing(null) }}
          onDelete={async (id) => { await removeAccount(id); setEditing(null) }}
        />
      )}
    </div>
  )
}

function AccountEditor({
  draft, isNew, isDefault, onClose, onSave, onDelete,
}: {
  draft: Account
  isNew: boolean
  isDefault: boolean
  onClose: () => void
  onSave: (a: Account) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(draft.name)
  const [icon, setIcon] = useState(draft.icon)
  const [color, setColor] = useState(draft.color)
  const [openingRaw, setOpeningRaw] = useState(
    draft.openingBalance ? draft.openingBalance.toFixed(2).replace('.', ',') : '',
  )
  const canSave = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />

        <div className="mb-4 flex flex-col items-center gap-2">
          <span className="grid h-16 w-16 place-items-center rounded-full text-2xl" style={{ background: color }}>{icon}</span>
        </div>

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank PJ"
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

        <label className="mb-1 block px-1 text-xs font-medium text-neutral-500">Saldo inicial (R$)</label>
        <input value={openingRaw} onChange={(e) => setOpeningRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
          className="tnum mb-1 w-full rounded-2xl bg-ink-muted px-4 py-3 text-right text-lg font-bold text-white outline-none focus:ring-2 focus:ring-brand-500" />
        <p className="mb-4 px-1 text-xs text-neutral-600">
          Quanto a conta tinha quando você começou a registrar aqui. O saldo atualiza sozinho com os lançamentos.
        </p>

        <button
          onClick={() => onSave({ ...draft, name: name.trim(), icon, color, openingBalance: parseSigned(openingRaw) })}
          disabled={!canSave}
          className={`w-full rounded-2xl py-4 text-base font-bold ${canSave ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          {isNew ? 'Criar conta' : 'Salvar'}
        </button>
        {!isNew && !isDefault && (
          <button onClick={() => { if (window.confirm(`Excluir a conta "${draft.name}"? Os lançamentos ficam sem conta.`)) onDelete(draft.id) }}
            className="mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-rose-400 active:bg-ink-muted">
            Excluir conta
          </button>
        )}
        {isDefault && !isNew && (
          <p className="mt-2 text-center text-xs text-neutral-600">A conta padrão não pode ser excluída.</p>
        )}
      </div>
    </div>
  )
}
