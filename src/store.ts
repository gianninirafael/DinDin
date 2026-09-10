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
  loadHabits,
  putHabit,
  deleteHabitFromDB,
  loadHabitEntries,
  putHabitEntry,
  loadFixedBills,
  putFixedBill,
  deleteFixedBillFromDB,
  loadDesejos,
  putDesejo,
  deleteDesejoFromDB,
  loadAccounts,
  putAccount,
  deleteAccountFromDB,
  DEFAULT_ACCOUNT_ID,
} from './lib/db'
import type { Caixinha, Pendencia, Habit, HabitEntry, FixedBill, Desejo, Account } from './types'
import type { BackupData } from './lib/backup'
import { monthKeyOf, todayISO } from './lib/format'
import { ns } from './lib/ns'

const LAST_DATE_KEY = ns('lastDate')
const AVAILABLE_KEY = ns('availableToBudget')
const WEEKLY_KEY = ns('weeklyWallet')
const HOURLY_KEY = ns('hourlyRate')
const LAST_ACCOUNT_KEY = ns('lastAccount')

/** Fase 7 pause window before a desejo can be decided. */
export const DESEJO_COOLDOWN_MS = 24 * 60 * 60 * 1000

function readHourly(): number {
  try {
    return Number(localStorage.getItem(HOURLY_KEY)) || 0
  } catch {
    return 0
  }
}

function readLastAccount(): string {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY) || DEFAULT_ACCOUNT_ID
  } catch {
    return DEFAULT_ACCOUNT_ID
  }
}

function readWeekly(): number {
  try {
    return Number(localStorage.getItem(WEEKLY_KEY)) || 0
  } catch {
    return 0
  }
}

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
  habits: Habit[]
  habitEntries: HabitEntry[]
  fixedBills: FixedBill[]
  desejos: Desejo[]
  accounts: Account[]
  loaded: boolean
  activeMonth: string // yyyy-mm
  lastDate: string // remembered date for the next new entry
  availableToBudget: number // manual "disponível para orçar" pool (zero-based)
  setAvailableToBudget: (value: number) => void
  weeklyWallet: number // "carteira semanal física" amount; 0 = disabled
  setWeeklyWallet: (value: number) => void
  hourlyRate: number // "quanto vale sua hora" — for cost-in-work-hours (Fase 7)
  setHourlyRate: (value: number) => void
  lastAccountId: string // sticky account for the next new entry (Fase 8)
  setLastAccountId: (id: string) => void
  load: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<string>
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
  // hábitos (Fase 5)
  saveHabit: (h: Habit) => Promise<void>
  removeHabit: (id: string) => Promise<void>
  logHabitBuy: (items: { habitId: string; units: number }[], date: string) => Promise<void>
  resistHabit: (habitId: string, units: number, date: string) => Promise<void>
  // contas fixas (Fase 6)
  saveFixedBill: (b: FixedBill) => Promise<void>
  removeFixedBill: (id: string) => Promise<void>
  // desejos (Fase 7)
  addDesejo: (input: { name: string; amount: number; note?: string }) => Promise<void>
  removeDesejo: (id: string) => Promise<void>
  decideDesejo: (id: string, decision: 'comprei' | 'deixei_passar') => Promise<void>
  // contas (Fase 8)
  saveAccount: (a: Account) => Promise<void>
  removeAccount: (id: string) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  transactions: [],
  categories: [],
  caixinhas: [],
  pendencias: [],
  habits: [],
  habitEntries: [],
  fixedBills: [],
  desejos: [],
  accounts: [],
  loaded: false,
  activeMonth: monthKeyOf(todayISO()),
  lastDate: readLastDate(),
  availableToBudget: readAvailable(),
  weeklyWallet: readWeekly(),
  hourlyRate: readHourly(),
  lastAccountId: readLastAccount(),

  setAvailableToBudget: (value) => {
    try {
      localStorage.setItem(AVAILABLE_KEY, String(value))
    } catch {
      // ignore storage failures
    }
    set({ availableToBudget: value })
  },

  setWeeklyWallet: (value) => {
    try {
      localStorage.setItem(WEEKLY_KEY, String(value))
    } catch {
      // ignore storage failures
    }
    set({ weeklyWallet: value })
  },

  setHourlyRate: (value) => {
    try {
      localStorage.setItem(HOURLY_KEY, String(value))
    } catch {
      // ignore storage failures
    }
    set({ hourlyRate: value })
  },

  setLastAccountId: (id) => {
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, id)
    } catch {
      // ignore storage failures
    }
    set({ lastAccountId: id })
  },

  load: async () => {
    const [transactions, categories, caixinhas, pendencias, habits, habitEntries] =
      await Promise.all([
        loadTransactions(),
        loadCategories(),
        loadCaixinhas(),
        loadPendencias(),
        loadHabits(),
        loadHabitEntries(),
      ])
    const [fixedBills, desejos, accounts] = await Promise.all([
      loadFixedBills(),
      loadDesejos(),
      loadAccounts(),
    ])
    set({
      transactions,
      categories: sortCats(categories),
      caixinhas: sortCaixinhas(caixinhas),
      pendencias,
      habits: [...habits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      habitEntries,
      fixedBills: [...fixedBills].sort((a, b) => a.dueDay - b.dueDay),
      desejos: [...desejos].sort((a, b) => b.createdAt - a.createdAt),
      accounts: sortAccounts(accounts),
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
    return tx.id
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

  // Confirming = the real event happened. Behaviour depends on the origin:
  // - reembolso: the money came back → the original expense stops counting as
  //   spend (net) and the amount becomes available to budget again.
  // - caixinha-linked (sobra/manual): the value lands in the caixinha.
  // - estouro/others: just clears the reminder.
  confirmPendencia: async (id) => {
    const p = get().pendencias.find((x) => x.id === id)
    if (!p) return
    if (p.origin === 'reembolso' && p.transactionId) {
      const tx = get().transactions.find((t) => t.id === p.transactionId)
      if (tx) await get().updateTransaction({ ...tx, reimbursed: true })
      get().setAvailableToBudget(
        Math.round((get().availableToBudget + p.amount) * 100) / 100,
      )
    } else if (p.caixinhaId) {
      await get().depositToCaixinha(p.caixinhaId, p.amount)
    }
    await deletePendenciaFromDB(id)
    set({ pendencias: get().pendencias.filter((x) => x.id !== id) })
  },

  dismissPendencia: async (id) => {
    await deletePendenciaFromDB(id)
    set({ pendencias: get().pendencias.filter((x) => x.id !== id) })
  },

  saveHabit: async (h) => {
    await putHabit(h)
    const rest = get().habits.filter((x) => x.id !== h.id)
    set({ habits: [...rest, h].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) })
  },

  removeHabit: async (id) => {
    await deleteHabitFromDB(id)
    set({ habits: get().habits.filter((h) => h.id !== id) })
  },

  logHabitBuy: async (items, date) => {
    const habits = get().habits
    const now = Date.now()
    const entries: HabitEntry[] = []
    items.forEach((it, i) => {
      if (it.units <= 0) return
      const h = habits.find((x) => x.id === it.habitId)
      if (!h) return
      entries.push({
        id: crypto.randomUUID(),
        habitId: it.habitId,
        units: it.units,
        amount: Math.round(it.units * h.unitPrice * 100) / 100,
        kind: 'buy',
        date,
        createdAt: now + i,
      })
    })
    await Promise.all(entries.map(putHabitEntry))
    set({ habitEntries: [...get().habitEntries, ...entries] })
  },

  // "Resisti": logs the resisted units and opens a resistência pendência to
  // actually move that money into a caixinha (manual confirmation).
  resistHabit: async (habitId, units, date) => {
    const h = get().habits.find((x) => x.id === habitId)
    if (!h || units <= 0) return
    const amount = Math.round(units * h.unitPrice * 100) / 100
    const entry: HabitEntry = {
      id: crypto.randomUUID(),
      habitId,
      units,
      amount,
      kind: 'resist',
      date,
      createdAt: Date.now(),
    }
    await putHabitEntry(entry)
    set({ habitEntries: [...get().habitEntries, entry] })
    await get().createPendencia({
      origin: 'resistencia',
      caixinhaId: h.caixinhaId,
      amount,
      note: `Resisti: ${h.name}`,
    })
  },

  saveFixedBill: async (b) => {
    await putFixedBill(b)
    const rest = get().fixedBills.filter((x) => x.id !== b.id)
    set({ fixedBills: [...rest, b].sort((a, c) => a.dueDay - c.dueDay) })
  },

  removeFixedBill: async (id) => {
    await deleteFixedBillFromDB(id)
    set({ fixedBills: get().fixedBills.filter((b) => b.id !== id) })
  },

  // A desejo starts "aberto" and paused; the 24h cooldown must pass before it
  // can be decided (comprei / deixei passar). No transaction is created here —
  // if bought, the owner logs it normally; if let go, the amount counts as saved.
  addDesejo: async (input) => {
    const now = Date.now()
    const d: Desejo = {
      id: crypto.randomUUID(),
      name: input.name,
      amount: input.amount,
      note: input.note,
      createdAt: now,
      releaseAt: now + DESEJO_COOLDOWN_MS,
      status: 'aberto',
    }
    await putDesejo(d)
    set({ desejos: [d, ...get().desejos] })
  },

  removeDesejo: async (id) => {
    await deleteDesejoFromDB(id)
    set({ desejos: get().desejos.filter((d) => d.id !== id) })
  },

  decideDesejo: async (id, decision) => {
    const d = get().desejos.find((x) => x.id === id)
    if (!d) return
    const updated: Desejo = { ...d, status: decision, decidedAt: Date.now() }
    await putDesejo(updated)
    set({ desejos: get().desejos.map((x) => (x.id === id ? updated : x)) })
  },

  saveAccount: async (a) => {
    await putAccount(a)
    const rest = get().accounts.filter((x) => x.id !== a.id)
    set({ accounts: sortAccounts([...rest, a]) })
  },

  // Deleting an account leaves its transactions with a now-missing accountId;
  // balances simply drop them (the UI shows "Conta removida" as a fallback).
  removeAccount: async (id) => {
    if (id === DEFAULT_ACCOUNT_ID) return // keep the fallback account
    await deleteAccountFromDB(id)
    const next = get().accounts.filter((a) => a.id !== id)
    set({ accounts: next })
    if (get().lastAccountId === id) get().setLastAccountId(DEFAULT_ACCOUNT_ID)
  },

  setActiveMonth: (activeMonth) => set({ activeMonth }),
}))

function sortCats(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function sortCaixinhas(list: Caixinha[]): Caixinha[] {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function sortAccounts(list: Account[]): Account[] {
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
    if (t.kind === 'expense') {
      if (!t.reimbursed) expense += t.amount // reimbursed = net zero
    } else if (t.kind === 'income') income += t.amount
  }
  return { expense, income, balance: income - expense }
}

/** Total expense spent per category id within the given month. */
export function monthSpendByCategory(txs: Transaction[], monthKey: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of txs) {
    if (t.kind !== 'expense' || t.reimbursed || !t.date.startsWith(monthKey)) continue
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount
  }
  return out
}

/** Sum of all category monthly budgets (the total already allocated). */
export function totalBudgeted(cats: Category[]): number {
  return cats.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0)
}

/** Total flagged-impulse expense within the month (excludes reimbursed). */
export function monthImpulse(txs: Transaction[], monthKey: string): number {
  let sum = 0
  for (const t of txs) {
    if (t.kind !== 'expense' || t.reimbursed || !t.impulse) continue
    if (!t.date.startsWith(monthKey)) continue
    sum += t.amount
  }
  return sum
}

/**
 * Current balance of an account = opening balance, plus income, minus expense
 * (reimbursed expenses net to zero), plus/minus transfers in/out. Transactions
 * with no accountId (saved before Fase 8) count toward the default account.
 */
export function accountBalance(acc: Account, txs: Transaction[]): number {
  let bal = acc.openingBalance
  for (const t of txs) {
    const isOwner = t.accountId === acc.id || (acc.id === DEFAULT_ACCOUNT_ID && !t.accountId)
    if (t.kind === 'transfer') {
      if (isOwner) bal -= t.amount
      if (t.toAccountId === acc.id) bal += t.amount
    } else if (t.kind === 'income') {
      if (isOwner) bal += t.amount
    } else if (t.kind === 'expense') {
      if (isOwner && !t.reimbursed) bal -= t.amount
    }
  }
  return bal
}

/** Total across all non-archived accounts (patrimônio). */
export function netWorth(accounts: Account[], txs: Transaction[]): number {
  return accounts
    .filter((a) => !a.archived)
    .reduce((s, a) => s + accountBalance(a, txs), 0)
}

export function availableMonths(txs: Transaction[]): string[] {
  const set = new Set<string>()
  for (const t of txs) set.add(t.date.slice(0, 7))
  set.add(monthKeyOf(todayISO()))
  return [...set].sort((a, b) => b.localeCompare(a))
}
