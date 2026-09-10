import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Transaction, Category, Caixinha, Pendencia, Habit, HabitEntry, FixedBill, Desejo } from '../types'
import { DEFAULT_CATEGORIES } from '../data/categories'
import { DB_NAME } from './ns'

interface DinDinDB extends DBSchema {
  transactions: {
    key: string
    value: Transaction
    indexes: { 'by-date': string }
  }
  categories: {
    key: string
    value: Category
  }
  caixinhas: {
    key: string
    value: Caixinha
  }
  pendencias: {
    key: string
    value: Pendencia
  }
  habits: {
    key: string
    value: Habit
  }
  habitEntries: {
    key: string
    value: HabitEntry
  }
  fixedBills: {
    key: string
    value: FixedBill
  }
  desejos: {
    key: string
    value: Desejo
  }
}

let dbPromise: Promise<IDBPDatabase<DinDinDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DinDinDB>(DB_NAME, 6, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' })
          store.createIndex('by-date', 'date')
        }
        if (oldVersion < 2) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
        if (oldVersion < 3) {
          db.createObjectStore('caixinhas', { keyPath: 'id' })
          db.createObjectStore('pendencias', { keyPath: 'id' })
        }
        if (oldVersion < 4) {
          db.createObjectStore('habits', { keyPath: 'id' })
          db.createObjectStore('habitEntries', { keyPath: 'id' })
        }
        if (oldVersion < 5) {
          db.createObjectStore('fixedBills', { keyPath: 'id' })
        }
        if (oldVersion < 6) {
          db.createObjectStore('desejos', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// ---- transactions ----

export async function loadTransactions(): Promise<Transaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-date')
}

export async function putTransaction(tx: Transaction): Promise<void> {
  const db = await getDB()
  await db.put('transactions', tx)
}

export async function putManyTransactions(txs: Transaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  await Promise.all([...txs.map((t) => tx.store.put(t)), tx.done])
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('transactions', id)
}

// ---- categories ----

/** Loads categories, seeding the store with defaults on first run. */
export async function loadCategories(): Promise<Category[]> {
  const db = await getDB()
  const existing = await db.getAll('categories')
  if (existing.length > 0) return existing

  const tx = db.transaction('categories', 'readwrite')
  await Promise.all([
    ...DEFAULT_CATEGORIES.map((c, i) => tx.store.put({ ...c, order: i })),
    tx.done,
  ])
  return db.getAll('categories')
}

export async function putCategory(cat: Category): Promise<void> {
  const db = await getDB()
  await db.put('categories', cat)
}

export async function putManyCategories(cats: Category[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('categories', 'readwrite')
  await Promise.all([...cats.map((c) => tx.store.put(c)), tx.done])
}

export async function deleteCategoryFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('categories', id)
}

// ---- caixinhas ----

export async function loadCaixinhas(): Promise<Caixinha[]> {
  const db = await getDB()
  return db.getAll('caixinhas')
}

export async function putCaixinha(c: Caixinha): Promise<void> {
  const db = await getDB()
  await db.put('caixinhas', c)
}

export async function deleteCaixinhaFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('caixinhas', id)
}

// ---- pendencias ----

export async function loadPendencias(): Promise<Pendencia[]> {
  const db = await getDB()
  return db.getAll('pendencias')
}

export async function putPendencia(p: Pendencia): Promise<void> {
  const db = await getDB()
  await db.put('pendencias', p)
}

export async function deletePendenciaFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendencias', id)
}

// ---- habits (Fase 5) ----

export async function loadHabits(): Promise<Habit[]> {
  const db = await getDB()
  return db.getAll('habits')
}

export async function putHabit(h: Habit): Promise<void> {
  const db = await getDB()
  await db.put('habits', h)
}

export async function deleteHabitFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('habits', id)
}

export async function loadHabitEntries(): Promise<HabitEntry[]> {
  const db = await getDB()
  return db.getAll('habitEntries')
}

export async function putHabitEntry(e: HabitEntry): Promise<void> {
  const db = await getDB()
  await db.put('habitEntries', e)
}

// ---- contas fixas (Fase 6) ----

export async function loadFixedBills(): Promise<FixedBill[]> {
  const db = await getDB()
  return db.getAll('fixedBills')
}

export async function putFixedBill(b: FixedBill): Promise<void> {
  const db = await getDB()
  await db.put('fixedBills', b)
}

export async function deleteFixedBillFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('fixedBills', id)
}

// ---- desejos (Fase 7) ----

export async function loadDesejos(): Promise<Desejo[]> {
  const db = await getDB()
  return db.getAll('desejos')
}

export async function putDesejo(d: Desejo): Promise<void> {
  const db = await getDB()
  await db.put('desejos', d)
}

export async function deleteDesejoFromDB(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('desejos', id)
}
