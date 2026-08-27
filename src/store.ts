import { create } from 'zustand'
import type { Transaction } from './types'
import { loadTransactions, putTransaction, deleteTransaction } from './lib/db'
import { monthKeyOf, todayISO } from './lib/format'

interface State {
  transactions: Transaction[]
  loaded: boolean
  activeMonth: string // yyyy-mm
  load: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  setActiveMonth: (month: string) => void
}

export const useStore = create<State>((set, get) => ({
  transactions: [],
  loaded: false,
  activeMonth: monthKeyOf(todayISO()),

  load: async () => {
    const transactions = await loadTransactions()
    set({ transactions, loaded: true })
  },

  addTransaction: async (input) => {
    const tx: Transaction = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    await putTransaction(tx)
    set({ transactions: [...get().transactions, tx] })
  },

  removeTransaction: async (id) => {
    await deleteTransaction(id)
    set({ transactions: get().transactions.filter((t) => t.id !== id) })
  },

  setActiveMonth: (activeMonth) => set({ activeMonth }),
}))

// ---- selectors (derived helpers) ----

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
