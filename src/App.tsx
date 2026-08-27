import { useEffect, useState } from 'react'
import { useStore, availableMonths } from './store'
import { monthLabel } from './lib/format'
import type { Transaction } from './types'
import Home from './components/Home'
import Charts from './components/Charts'
import AddSheet from './components/AddSheet'

type Tab = 'home' | 'charts'

export default function App() {
  const { load, loaded, transactions, activeMonth, setActiveMonth } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [adding, setAdding] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [monthOpen, setMonthOpen] = useState(false)

  const sheetOpen = adding || !!editingTx
  const closeSheet = () => {
    setAdding(false)
    setEditingTx(null)
  }

  useEffect(() => {
    load()
  }, [load])

  if (!loaded) {
    return <div className="grid h-full place-items-center text-neutral-500">Carregando…</div>
  }

  const months = availableMonths(transactions)

  return (
    <div className="min-h-full bg-ink">
      {tab === 'home' ? <Home onSelect={setEditingTx} /> : <Charts />}

      {/* Month picker button (top-right floating) */}
      <button
        onClick={() => setMonthOpen(true)}
        className="fixed right-4 top-7 z-20 rounded-full bg-ink-muted px-3.5 py-1.5 text-sm font-semibold text-white active:bg-ink-line"
      >
        {monthLabel(activeMonth)} ▾
      </button>

      {monthOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setMonthOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-ink-soft p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
            <h3 className="mb-2 px-2 text-sm font-semibold text-neutral-500">Escolher mês</h3>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {months.map((mo) => (
                <button
                  key={mo}
                  onClick={() => {
                    setActiveMonth(mo)
                    setMonthOpen(false)
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-left text-[15px] ${
                    mo === activeMonth
                      ? 'bg-brand-500 font-bold text-black'
                      : 'text-white active:bg-ink-muted'
                  }`}
                >
                  {monthLabel(mo)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-6 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <NavBtn label="Início" active={tab === 'home'} onClick={() => setTab('home')} icon="🏠" />
          <div className="w-16" />
          <NavBtn label="Gráficos" active={tab === 'charts'} onClick={() => setTab('charts')} icon="📊" />
        </div>
        <button
          onClick={() => setAdding(true)}
          className="absolute -top-6 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-brand-500 text-3xl font-light text-black shadow-lg shadow-brand-500/20 active:scale-95"
        >
          +
        </button>
      </nav>

      {sheetOpen && <AddSheet editing={editingTx} onClose={closeSheet} />}
    </div>
  )
}

function NavBtn({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: string
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5">
      <span className={`text-xl ${active ? '' : 'opacity-40 grayscale'}`}>{icon}</span>
      <span className={`text-xs ${active ? 'font-semibold text-brand-400' : 'text-neutral-500'}`}>
        {label}
      </span>
    </button>
  )
}
