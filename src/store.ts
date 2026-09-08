import { useMemo } from 'react'
import { create } from 'zustand'
import type { Transaction, Category } from './types'
import {
  loadTransactions,
  putTransaction,
  putManyTransactions,
  deleteTransaction,
  loadCategories,
  putCategory,
  putManyCategories,
  deleteCategoryFromDB,
  loadCaixinhas,
  putCaixinha,
  deleteCaixinhaFromDB,
  loadPendencias,
  putPendencia,
  deletePendenciaFromDB,
} from './lib/db'
import type { Caixinha, Pendencia } from './types'
import type { BackupData } from './lib/backup'
import { monthKeyOf, todayISO } from './lib/format'
import { ns } from './lib/ns'

const LAST_DATE_KEY = ns('lastDate')
const AVAILABLE_KEY = ns('availableToBudget')

function readLastDate(): string {
  try {
    return localStorage.getItem(LAST_DATE_KEY) || todayISO()
  } catch {
    return todayISO()
  }
}

function readAvailable(): number {
  try {
    return Number(localStorage.getItem(AVAILABLE_KEY)) || 0
  } catch {
    return 0
  }
}

interface State {
  transactions: Transaction[]
  categories: Category[]
  caixinhas: Caixinha[]
  pendencias: Pendencia[]
  loaded: boolean
  activeMonth: string // yyyy-mm
  lastDate: string // remembered date for the next new entry
  availableToBudget: number // manual "disponível para orçar" pool (zero-based)
  setAvailableToBudget: (value: number) => void
  load: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (tx: Transaction) => Promise<void>
  addTransactions: (inputs: Omit<Transaction, 'id' | 'createdAt'>[]) => Promise<number>
  removeTransaction: (id: string) => Promise<void>
  saveCategory: (cat: Category) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  moveCategory: (kind: Category['kind'], id: string, dir: -1 | 1) => Promise<void>
  importBackup: (data: BackupData) => Promise<{ transactions: number; categories: number }>
  setActiveMonth: (month: string) => void
  // caixinhas + pendencias (Fase 3)
  saveCaixinha: (c: Caixinha) => Promise<void>
  removeCaixinha: (id: string) => Promise<void>
  depositToCaixinha: (id: string, amount: number) => Promise<void>
  createPendencia: (p: Omit<Pendencia, 'id' | 'createdAt' | 'status'>) => Promise<void>
  confirmPendencia: (id: string) => Promise<void>
  dismissPendencia: (id: string) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  transactions: [],
  categories: [],
  caixinhas: [],
  pendencias: [],
  loaded: false,
  activeMonth: monthKeyOf(todayISO()),
  lastDate: readLastDate(),
  availableToBudget: readAvailable(),

  setAvailableToBudget: (value) => {
    try {
      localStorage.setItem(AVAILABLE_KEY, String(value))
    } catch {
      // ignore storage failures
    }
    set({ availableToBudget: value })
  },

  load: async () => {
    const [transactions, categories, caixinhas, pendencias] = await Promise.all([
      loadTransactions(),
      loadCategories(),
      loadCaixinhas(),
      loadPendencias(),
    ])
    set({
      transactions,
      categories: sortCats(categories),
      caixinhas: sortCaixinhas(caixinhas),
      pendencias,
      loaded: true,
    })
  },

  addTransaction: async (input) => {
    const tx: Transaction = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    await putTransaction(tx)
    try {
      localStorage.setItem(LAST_DATE_KEY, tx.date)
    } catch {
      // ignore storage failures
    }
    set({ transactions: [...get().transactions, tx], lastDate: tx.date })
  },

  updateTransaction: async (tx) => {
    await putTransaction(tx)
    set({ transactions: get().transactions.map((t) => (t.id === tx.id ? tx : t)) })
  },

  addTransactions: async (inputs) => {
    if (inputs.length === 0) return 0
    const now = Date.now()
    const txs: Transaction[] = inputs.map((input, i) => ({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now + i,
    }))
    await putManyTransactions(txs)
    const latest = txs.reduce((a, b) => (a.date >= b.date ? a : b)).date
    try {
      localStorage.setItem(LAST_DATE_KEY, latest)
    } catch {
      // ignore storage failures
    }
    set({ transactions: [...get().transactions, ...txs], lastDate: latest })
    return txs.length
  },

  removeTransaction: async (id) => {
    await deleteTransaction(id)
    set({ transactions: get().transactions.filter((t) => t.id !== id) })
  },

  saveCategory: async (cat) => {
    await putCategory(cat)
    const rest = get().categories.filter((c) => c.id !== cat.id)
    set({ categories: sortCats([...rest, cat]) })
  },

  removeCategory: async (id) => {
    await deleteCategoryFromDB(id)
    set({ categories: get().categories.filter((c) => c.id !== id) })
  },

  // Swap a category with its same-kind neighbour in the given direction.
  moveCategory: async (kind, id, dir) => {
    const all = get().categories
    const siblings = sortCats(all.filter((c) => c.kind === kind || c.kind === 'both'))
    const idx = siblings.findIndex((c) => c.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return

    const a = siblings[idx]
    const b = siblings[swapIdx]
    const aOrder = a.order ?? idx
    const bOrder = b.order ?? swapIdx
    const updatedA = { ...a, order: bOrder }
    const updatedB = { ...b, order: aOrder }

    await Promise.all([putCategory(updatedA), putCategory(updatedB)])
    const map = new Map([
      [updatedA.id, updatedA],
      [updatedB.id, updatedB],
    ])
    set({ categories: sortCats(all.map((c) => map.get(c.id) ?? c)) })
  },

  // Merge a backup by id (upsert): existing ids are overwritten, new ones added.
  // Safe to run on a device that already has data — never duplicates.
  importBackup: async (data) => {
    await Promise.all([
      putManyCategories(data.categories),
      putManyTransactions(data.transactions),
    ])

    const catMap = new Map(get().categories.map((c) => [c.id, c]))
    for (const c of data.categories) catMap.set(c.id, c)
    const txMap = new Map(get().transactions.map((t) => [t.id, t]))
    for (const t of data.transactions) txMap.set(t.id, t)

    const next: Partial<State> = {
      categories: sortCats([...catMap.values()]),
      transactions: [...txMap.values()],
    }
    if (data.lastDate) {
      try {
        localStorage.setItem(LAST_DATE_KEY, data.lastDate)
      } catch {
        // ignore storage failures
      }
      next.lastDate = data.lastDate
    }
    set(next)
    return { transactions: data.transactions.length, categories: data.categories.length }
  },

  saveCaixinha: async (c) => {
    await putCaixinha(c)
    const rest = get().caixinhas.filter((x) => x.id !== c.id)
    set({ caixinhas: sortCaixinhas([...rest, c]) })
  },

  removeCaixinha: async (id) => {
    await deleteCaixinhaFromDB(id)
    set({ caixinhas: get().caixinhas.filter((c) => c.id !== id) })
  },

  depositToCaixinha: async (id, amount) => {
    const c = get().caixinhas.find((x) => x.id === id)
    if (!c) return
    const updated = { ...c, balance: Math.round((c.balance + amount) * 100) / 100 }
    await putCaixinha(updated)
    set({ caixinhas: get().caixinhas.map((x) => (x.id === id ? updated : x)) })
  },

  createPendencia: async (input) => {
    const p: Pendencia = { ...input, id: crypto.randomUUID(), status: 'pendente', createdAt: Date.now() }
    await putPendencia(p)
    set({ pendencias: [...get().pendencias, p] })
  },

  // Confirming = the real transfer happened: value lands in the caixinha.
  confirmPendencia: async (id) => {
    const p = get().pendencias.find((x) => x.id === id)
    if (!p) return
    if (p.caixinhaId) await get().depositToCaixinha(p.caixinhaId, p.amount)
    await deletePendenciaFromDB(id)
    set({ pendencias: get().pendencias.filter((x) => x.id !== id) })
  },

  dismissPendencia: async (id) => {
    await deletePendenciaFromDB(id)
    set({ pendencias: get().pendencias.filter((x) => x.id !== id) })
  },

  setActiveMonth: (activeMonth) => set({ activeMonth }),
}))

function sortCats(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function sortCaixinhas(list: Caixinha[]): Caixinha[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// ---- selectors (derived helpers) ----

export function useCategoryMap(): Record<string, Category> {
  const categories = useStore((s) => s.categories)
  return useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )
}

export function monthTransactions(txs: Transaction[], monthKey: string) {
  return txs
    .filter((t) => t.date.startsWith(monthKey))
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
}

export function monthTotals(txs: Transaction[]) {
  let expense = 0
  let income = 0
  for (const t of txs) {
    if (t.kind === 'expense') expense += t.amount
    else if (t.kind === 'income') income += t.amount
  }
  return { expense, income, balance: income - expense }
}

/** Total expense spent per category id within the given month. */
export function monthSpendByCategory(txs: Transaction[], monthKey: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of txs) {
    if (t.kind !== 'expense' || !t.date.startsWith(monthKey)) continue
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount
  }
  return out
}

/** Sum of all category monthly budgets (the total already allocated). */
export function totalBudgeted(cats: Category[]): number {
  return cats.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)
}

export function availableMonths(txs: Transaction[]): string[] {
  const set = new Set<string>()
  for (const t of txs) set.add(t.date.slice(0, 7))
  set.add(monthKeyOf(todayISO()))
  return [...set].sort((a, b) => b.localeCompare(a))
}
