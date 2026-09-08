import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { formatMoney } from '../lib/format'
import { playConfirm, playClick } from '../lib/sound'

const ORIGIN_LABEL: Record<string, string> = {
  reembolso: 'Reembolso',
  sobra: 'Sobra',
  resistencia: 'Resisti',
  estouro: 'Repor estouro',
  manual: 'Lembrete',
}

/** Persistent home banner for unconfirmed pendências — stays until resolved. */
export default function PendingAlert() {
  const { pendencias, caixinhas, confirmPendencia, dismissPendencia } = useStore()
  const [open, setOpen] = useState(false)

  const pendentes = useMemo(() => pendencias.filter((p) => p.status === 'pendente'), [pendencias])
  if (pendentes.length === 0) return null

  const total = pendentes.reduce((s, p) => s + p.amount, 0)
  const caixinhaName = (id?: string) => caixinhas.find((c) => c.id === id)?.name

  return (
    <>
      <button
        onClick={() => { playClick(); setOpen(true) }}
        className="mb-4 flex w-full items-center gap-3 rounded-card border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-left"
      >
        <span className="text-xl">🔔</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-white">
            {pendentes.length} lembrete{pendentes.length > 1 ? 's' : ''} a confirmar
          </span>
          <span className="block text-xs text-brand-400">
            {formatMoney(total)} aguardando sua confirmação
          </span>
        </span>
        <span className="text-neutral-400">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-ink-soft p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
            <h3 className="mb-1 text-lg font-semibold text-white">Pendências</h3>
            <p className="mb-4 text-sm text-neutral-500">
              Confirme quando o dinheiro sair de verdade — aí entra na caixinha. Ou descarte.
            </p>
            <div className="space-y-2">
              {pendentes.map((p) => (
                <div key={p.id} className="rounded-2xl bg-ink-muted p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium text-white">
                        {p.note || ORIGIN_LABEL[p.origin] || 'Pendência'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {ORIGIN_LABEL[p.origin]}
                        {caixinhaName(p.caixinhaId) ? ` · ${caixinhaName(p.caixinhaId)}` : ''}
                      </div>
                    </div>
                    <span className="tnum text-[15px] font-bold text-brand-400">{formatMoney(p.amount)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => { await confirmPendencia(p.id); playConfirm() }}
                      className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-black"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => dismissPendencia(p.id)}
                      className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-neutral-300"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
