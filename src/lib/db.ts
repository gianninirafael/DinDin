import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Transaction, Category } from '../types'
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
}

let dbPromise: Promise<IDBPDatabase<DinDinDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DinDinDB>(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' })
          store.createIndex('by-date', 'date')
        }
        if (oldVersion < 2) {
          db.createObjectStore('categories', { keyPath: 'id' })
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
