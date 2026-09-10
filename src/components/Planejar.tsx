import { useMemo, useState } from 'react'
import type { FixedBill } from '../types'
import { useStore, totalBudgeted } from '../store'
import { formatMoney, formatAmount, todayISO } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'
import { countsForCap, flexibleMonthly, weekRange, capOverDays, spendInRange } from '../lib/budget'

function parseNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function addMonths(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Planejar({ onClose }: { onClose: () => void }) {
  const {
    transactions, categories, availableToBudget, weeklyWallet, pendencias,
    fixedBills, saveFixedBill, removeFixedBill, saveCaixinha,
  } = useStore()
  const today = todayISO()

  // Renda irregular / dias cobertos
  const avgDaily = useMemo(() => {
    const from = (() => { const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
    let sum = 0
    for (const t of transactions) {
      if (t.kind !== 'expense' || t.reimbursed) continue
      if (t.date < from || t.date > today) continue
      sum += t.amount
    }
    return sum / 30
  }, [transactions, today])
  const diasCobertos = avgDaily > 0 ? Math.floor(availableToBudget / avgDaily) : null

  // Simulador
  const [custoRaw, setCustoRaw] = useState('')
  const [prazo, setPrazo] = useState(6)
  const [metaName, setMetaName] = useState('')
  const custo = parseNum(custoRaw)
  const aporte = prazo > 0 ? custo / prazo : 0
  const rendaLivre = availableToBudget - totalBudgeted(categories)
  const cabe = aporte <= rendaLivre

  // Contas fixas
  const totalFixas = fixedBills.reduce((s, b) => s + b.amount, 0)
  const [billEdit, setBillEdit] = useState<FixedBill | null>(null)

  // Checkpoint semanal
  const week = useMemo(() => weekRange(today), [today])
  const capCatIds = useMemo(() => new Set(categories.filter(countsForCap).map((c) => c.id)), [categories])
  const flexible = useMemo(() => flexibleMonthly(categories), [categories])
  const weekCap = weeklyWallet > 0 ? weeklyWallet : capOverDays(week.days, flexible)
  const weekSpent = spendInRange(transactions, week.start, week.end, capCatIds)
  const weekLeft = weekCap - weekSpent
  const pendentes = pendencias.filter((p) => p.status === 'pendente').length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">Fechar</button>
        <span className="text-lg font-semibold">Planejar</span>
        <span className="w-12" />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-10">
        {/* Renda irregular */}
        <section className="rounded-card bg-ink-soft p-4">
          <h3 className="text-sm font-semibold text-neutral-400">Renda irregular</h3>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-xs text-neutral-500">Dias cobertos</div>
              <div className="tnum text-3xl font-extrabold text-brand-400">
                {diasCobertos === null ? '—' : diasCobertos}
                <span className="ml-1 text-base font-semibold text-neutral-500">dias</span>
              </div>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <div>Na conta: <span className="tnum text-neutral-300">{formatMoney(availableToBudget)}</span></div>
              <div>Gasto médio: <span className="tnum text-neutral-300">{formatMoney(avgDaily)}/dia</span></div>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-600">Quanto tempo o que já está pra orçar cobre, no seu ritmo dos últimos 30 dias.</p>
        </section>

        {/* Simulador de projeto */}
        <section className="rounded-card bg-ink-soft p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-400">Simulador de projeto</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block px-1 text-xs text-neutral-500">Custo total (R$)</span>
              <input value={custoRaw} onChange={(e) => setCustoRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
                className="tnum w-full rounded-2xl bg-ink-muted px-3 py-3 text-right text-lg font-bold text-white outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block px-1 text-xs text-neutral-500">Prazo (meses)</span>
              <div className="flex items-center justify-between rounded-2xl bg-ink-muted px-2 py-2">
                <button onClick={() => setPrazo((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-lg">−</button>
                <span className="tnum text-lg font-bold">{prazo}</span>
                <button onClick={() => setPrazo((p) => p + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-lg">+</button>
              </div>
            </label>
          </div>
          {custo > 0 && (
            <div className="mt-3 rounded-2xl bg-ink-muted p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-neutral-400">Aporte mensal</span>
                <span className="tnum text-xl font-bold text-white">{formatMoney(aporte)}</span>
              </div>
              <div className={`mt-1 text-xs ${cabe ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cabe ? '✓ Cabe' : '✗ Não cabe'} na sobra pra alocar (~{formatMoney(rendaLivre)}/mês)
              </div>
              <input value={metaName} onChange={(e) => setMetaName(e.target.value)} placeholder="Nome da meta (ex.: Notebook)"
                className="mt-3 w-full rounded-xl bg-ink px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-neutral-600" />
              <button
                onClick={async () => {
                  if (!metaName.trim()) return
                  await saveCaixinha({
                    id: crypto.randomUUID(), name: metaName.trim(), icon: '🎯', color: '#7fdbca',
                    type: 'meta_com_prazo', balance: 0, target: custo, deadline: addMonths(today, prazo),
                  })
                  playConfirm()
                  setMetaName(''); setCustoRaw('')
                }}
                disabled={!metaName.trim()}
                className={`mt-2 w-full rounded-xl py-3 text-sm font-bold ${metaName.trim() ? 'bg-brand-500 text-black' : 'bg-ink text-neutral-600'}`}>
                Criar meta rastreável
              </button>
            </div>
          )}
        </section>

        {/* Contas fixas */}
        <section className="rounded-card bg-ink-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-400">Contas fixas</h3>
            <button onClick={() => { playClick(); setBillEdit({ id: crypto.randomUUID(), name: '', amount: 0, dueDay: 5 }) }}
              className="text-sm font-semibold text-brand-400">+ Nova</button>
          </div>
          {fixedBills.length === 0 ? (
            <p className="py-2 text-sm text-neutral-500">Sem contas fixas. Adicione aluguel, assinaturas… pra não ter surpresa no meio do mês.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {fixedBills.map((b) => (
                  <button key={b.id} onClick={() => setBillEdit(b)} className="flex w-full items-center gap-3 rounded-xl bg-ink-muted px-3 py-2.5 text-left active:bg-ink-line">
                    <span className="grid h-8 w-9 flex-shrink-0 place-items-center rounded-lg bg-ink text-xs font-bold text-neutral-400">{b.dueDay}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-white">{b.name}</span>
                    <span className="tnum text-[15px] font-semibold text-white">{formatMoney(b.amount)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-ink-line pt-2 text-sm">
                <span className="text-neutral-400">Total mensal</span>
                <span className="tnum font-bold text-white">{formatMoney(totalFixas)}</span>
              </div>
            </>
          )}
        </section>

        {/* Checkpoint semanal */}
        <section className="rounded-card bg-ink-soft p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-400">Checkpoint semanal</h3>
          <p className="mb-3 text-xs text-neutral-600">Ritual de domingo: revise a semana e ajuste.</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink-muted py-2">
              <div className="text-[11px] text-neutral-500">Teto</div>
              <div className="tnum text-sm font-bold text-neutral-200">{formatAmount(weekCap)}</div>
            </div>
            <div className="rounded-xl bg-ink-muted py-2">
              <div className="text-[11px] text-neutral-500">Gasto</div>
              <div className="tnum text-sm font-bold text-neutral-200">{formatAmount(weekSpent)}</div>
            </div>
            <div className="rounded-xl bg-ink-muted py-2">
              <div className="text-[11px] text-neutral-500">{weekLeft < 0 ? 'Estouro' : 'Sobra'}</div>
              <div className={`tnum text-sm font-bold ${weekLeft < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatAmount(Math.abs(weekLeft))}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {pendentes > 0 ? `${pendentes} pendência(s) aberta(s) pra confirmar na Home.` : 'Nenhuma pendência aberta.'}
          </p>
        </section>
      </div>

      {billEdit && (
        <FixedBillSheet
          draft={billEdit}
          isNew={!fixedBills.some((b) => b.id === billEdit.id)}
          onClose={() => setBillEdit(null)}
          onSave={async (b) => { await saveFixedBill(b); setBillEdit(null) }}
          onDelete={async (id) => { await removeFixedBill(id); setBillEdit(null) }}
        />
      )}
    </div>
  )
}

function FixedBillSheet({
  draft, isNew, onClose, onSave, onDelete,
}: {
  draft: FixedBill
  isNew: boolean
  onClose: () => void
  onSave: (b: FixedBill) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(draft.name)
  const [amountRaw, setAmountRaw] = useState(draft.amount ? draft.amount.toFixed(2).replace('.', ',') : '')
  const [dueDay, setDueDay] = useState(draft.dueDay)
  const canSave = name.trim().length > 0 && parseNum(amountRaw) > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
        <h3 className="mb-4 text-lg font-semibold text-white">{isNew ? 'Nova conta fixa' : 'Editar conta fixa'}</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Aluguel)"
          className="mb-3 w-full rounded-2xl bg-ink-muted px-4 py-3.5 text-base text-white outline-none focus:ring-2 focus:ring-brand-500" />
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block px-1 text-xs text-neutral-500">Valor (R$)</span>
            <input value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} inputMode="decimal" placeholder="0,00"
              className="tnum w-full rounded-2xl bg-ink-muted px-3 py-3 text-right text-lg font-bold text-white outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block px-1 text-xs text-neutral-500">Dia do mês</span>
            <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              className="tnum w-full rounded-2xl bg-ink-muted px-3 py-3 text-center text-lg font-bold text-white outline-none" />
          </label>
        </div>
        <button onClick={() => onSave({ ...draft, name: name.trim(), amount: parseNum(amountRaw), dueDay })}
          disabled={!canSave}
          className={`mt-4 w-full rounded-2xl py-4 text-base font-bold ${canSave ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'}`}>
          Salvar
        </button>
        {!isNew && (
          <button onClick={() => { if (window.confirm(`Excluir "${draft.name}"?`)) onDelete(draft.id) }}
            className="mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-rose-400 active:bg-ink-muted">Excluir</button>
        )}
      </div>
    </div>
  )
}
