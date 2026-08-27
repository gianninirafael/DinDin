import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Transaction } from '../types'

interface DinDinDB extends DBSchema {
  transactions: {
    key: string
    value: Transaction
    indexes: { 'by-date': string }
  }
}

let dbPromise: Promise<IDBPDatabase<DinDinDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DinDinDB>('dindin', 1, {
      upgrade(db) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' })
        store.createIndex('by-date', 'date')
      },
    })
  }
  return dbPromise
}

export async function loadTransactions(): Promise<Transaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-date')
}

export async function putTransaction(tx: Transaction): Promise<void> {
  const db = await getDB()
  await db.put('transactions', tx)
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('transactions', id)
}
