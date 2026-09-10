import { useEffect, useRef, useState } from 'react'
import { useStore, useCategoryMap, availableMonths } from './store'
import { monthLabel, todayISO } from './lib/format'
import { buildCSV, downloadFile } from './lib/export'
import { buildBackup, parseBackup } from './lib/backup'
import { playClick, isSoundOn, setSoundOn } from './lib/sound'
import { APP_VARIANT } from './lib/ns'
import type { Transaction } from './types'
import Home from './components/Home'
import Charts from './components/Charts'
import Budget from './components/Budget'
import Today from './components/Today'
import Caixinhas from './components/Caixinhas'
import Habits from './components/Habits'
import Planejar from './components/Planejar'
import Desejos from './components/Desejos'
import Contas from './components/Contas'
import AddSheet from './components/AddSheet'
import VoiceSheet from './components/VoiceSheet'

type Tab = 'home' | 'today' | 'budget' | 'charts'

export default function App() {
  const { load, loaded, transactions, categories, activeMonth, setActiveMonth, importBackup } =
    useStore()
  const catMap = useCategoryMap()

  const [tab, setTab] = useState<Tab>('home')
  const [adding, setAdding] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [monthOpen, setMonthOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [caixinhasOpen, setCaixinhasOpen] = useState(false)
  const [habitsOpen, setHabitsOpen] = useState(false)
  const [planejarOpen, setPlanejarOpen] = useState(false)
  const [desejosOpen, setDesejosOpen] = useState(false)
  const [contasOpen, setContasOpen] = useState(false)
  const [soundOn, setSoundOnState] = useState(isSoundOn())
  const restoreInputRef = useRef<HTMLInputElement>(null)

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundOnState(next)
    if (next) playClick()
  }

  const sheetOpen = adding || !!editingTx
  const closeSheet = () => {
    setAdding(false)
    setEditingTx(null)
  }

  function exportCSV() {
    if (transactions.length === 0) return
    downloadFile(`dindin-${todayISO()}.csv`, buildCSV(transactions, catMap))
    setDataOpen(false)
  }

  function exportBackup() {
    downloadFile(
      `dindin-backup-${todayISO()}.json`,
      buildBackup(transactions, categories, useStore.getState().lastDate),
      'application/json',
    )
    setDataOpen(false)
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file) return
    try {
      const data = parseBackup(await file.text())
      const ok = window.confirm(
        `Restaurar ${data.transactions.length} lançamento(s) e ${data.categories.length} categoria(s)?\n\n` +
          `Itens com o mesmo id são atualizados; nada é duplicado.`,
      )
      if (!ok) return
      const res = await importBackup(data)
      setDataOpen(false)
      window.alert(`Backup restaurado: ${res.transactions} lançamentos e ${res.categories} categorias.`)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Não foi possível ler o backup.')
    }
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
      {tab === 'home' ? (
        <Home
          onSelect={setEditingTx}
          onOpenCaixinhas={() => setCaixinhasOpen(true)}
          onOpenDesejos={() => setDesejosOpen(true)}
          onOpenContas={() => setContasOpen(true)}
        />
      ) : tab === 'today' ? (
        <Today />
      ) : tab === 'budget' ? (
        <Budget onPlanejar={() => setPlanejarOpen(true)} />
      ) : (
        <Charts />
      )}

      {APP_VARIANT && (
        <span className="fixed left-1/2 top-8 z-20 -translate-x-1/2 rounded-full bg-ink-muted px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-400">
          {APP_VARIANT.toUpperCase()}
        </span>
      )}

      {/* Month picker button (top-right floating) */}
      <button
        onClick={() => setMonthOpen(true)}
        className="fixed right-4 top-7 z-20 rounded-full bg-ink-muted px-3.5 py-1.5 text-sm font-semibold text-white active:bg-ink-line"
      >
        {monthLabel(activeMonth)} ▾
      </button>

      {/* Data menu (top-left floating): export CSV, backup, restore */}
      <button
        onClick={() => setDataOpen(true)}
        aria-label="Dados e backup"
        className="fixed left-4 top-7 z-20 grid h-9 w-9 place-items-center rounded-full bg-ink-muted text-base text-white active:bg-ink-line"
      >
        ⤓
      </button>

      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleRestoreFile}
        className="hidden"
      />

      {dataOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={() => setDataOpen(false)}>
          <div className="w-full rounded-t-3xl bg-ink-soft p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-line" />
            <h3 className="mb-3 px-2 text-sm font-semibold text-neutral-500">Dados e backup</h3>
            <div className="space-y-2">
              <DataAction
                icon="🧾"
                title="Exportar CSV"
                subtitle="Abrir no Google Sheets ou Excel"
                onClick={exportCSV}
              />
              <DataAction
                icon="💾"
                title="Fazer backup (.json)"
                subtitle="Salva tudo — guarde no Drive para não perder"
                onClick={exportBackup}
              />
              <DataAction
                icon="♻️"
                title="Restaurar backup (.json)"
                subtitle="Recupera seus dados de um arquivo salvo"
                onClick={() => restoreInputRef.current?.click()}
              />
              <DataAction
                icon={soundOn ? '🔊' : '🔇'}
                title={`Som dos toques: ${soundOn ? 'ligado' : 'desligado'}`}
                subtitle="Clique suave ao tocar nos botões"
                onClick={toggleSound}
              />
              <DataAction
                icon="🚬"
                title="Hábitos (beta)"
                subtitle="Rastreio de vícios — separado do orçamento"
                onClick={() => { setDataOpen(false); setHabitsOpen(true) }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Voice entry (secondary FAB, above the nav) */}
      <button
        onClick={() => {
          playClick()
          setVoiceOpen(true)
        }}
        aria-label="Ditar contas por voz"
        className="fixed bottom-[6.25rem] right-4 z-20 grid h-12 w-12 place-items-center rounded-full border border-ink-line bg-ink-soft text-xl shadow-lg active:scale-95"
      >
        🎙️
      </button>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <NavBtn label="Início" active={tab === 'home'} onClick={() => setTab('home')} icon="🏠" />
          <NavBtn label="Hoje" active={tab === 'today'} onClick={() => setTab('today')} icon="☀️" />
          <div className="w-10" />
          <NavBtn label="Orçamento" active={tab === 'budget'} onClick={() => setTab('budget')} icon="🎯" />
          <NavBtn label="Gráficos" active={tab === 'charts'} onClick={() => setTab('charts')} icon="📊" />
        </div>
        <button
          onClick={() => {
            playClick()
            setAdding(true)
          }}
          className="absolute -top-6 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-brand-500 text-3xl font-light text-black shadow-lg shadow-brand-500/20 active:scale-95"
        >
          +
        </button>
      </nav>

      {sheetOpen && <AddSheet editing={editingTx} onClose={closeSheet} />}
      {voiceOpen && <VoiceSheet onClose={() => setVoiceOpen(false)} />}
      {caixinhasOpen && <Caixinhas onClose={() => setCaixinhasOpen(false)} />}
      {habitsOpen && <Habits onClose={() => setHabitsOpen(false)} />}
      {planejarOpen && <Planejar onClose={() => setPlanejarOpen(false)} />}
      {desejosOpen && <Desejos onClose={() => setDesejosOpen(false)} />}
      {contasOpen && <Contas onClose={() => setContasOpen(false)} />}
    </div>
  )
}

function DataAction({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-ink-muted px-4 py-3 text-left active:bg-ink-line"
    >
      <span className="text-xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-white">{title}</span>
        <span className="block text-xs text-neutral-500">{subtitle}</span>
      </span>
    </button>
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
