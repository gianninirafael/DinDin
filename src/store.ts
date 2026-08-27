import { useMemo } from 'react'
import { create } from 'zustand'
import type { Transaction, Category } from './types'
import {
  loadTransactions,
  putTransaction,
  deleteTransaction,
  loadCategories,
  putCategory,
  deleteCategoryFromDB,
} from './lib/db'
import { monthKeyOf, todayISO } from './lib/format'

const LAST_DATE_KEY = 'dindin.lastDate'

function readLastDate(): string {
  try {
    return localStorage.getItem(LAST_DATE_KEY) || todayISO()
  } catch {
    return todayISO()
  }
}

interface State {
  transactions: Transaction[]
  categories: Category[]
  loaded: boolean
  activeMonth: string // yyyy-mm
  lastDate: string // remembered date for the next new entry
  load: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (tx: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  saveCategory: (cat: Category) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  moveCategory: (kind: Category['kind'], id: string, dir: -1 | 1) => Promise<void>
  setActiveMonth: (month: string) => void
}

export const useStore = create<State>((set, get) => ({
  transactions: [],
  categories: [],
  loaded: false,
  activeMonth: monthKeyOf(todayISO()),
  lastDate: readLastDate(),

  load: async () => {
    const [transactions, categories] = await Promise.all([
      loadTransactions(),
      loadCategories(),
    ])
    set({ transactions, categories: sortCats(categories), loaded: true })
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

  setActiveMonth: (activeMonth) => set({ activeMonth }),
}))

function sortCats(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
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

export function availableMonths(txs: Transaction[]): string[] {
  const set = new Set<string>()
  for (const t of txs) set.add(t.date.slice(0, 7))
  set.add(monthKeyOf(todayISO()))
  return [...set].sort((a, b) => b.localeCompare(a))
}
