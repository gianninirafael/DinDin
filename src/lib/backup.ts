import type { Transaction, Category } from '../types'

export interface BackupData {
  app: 'dindin'
  version: number
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  lastDate?: string
}

const BACKUP_VERSION = 1

/** Full snapshot of everything the app stores, for backup / restore. */
export function buildBackup(
  transactions: Transaction[],
  categories: Category[],
  lastDate?: string,
): string {
  const data: BackupData = {
    app: 'dindin',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    lastDate,
  }
  return JSON.stringify(data, null, 2)
}

function isTransaction(v: unknown): v is Transaction {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    (t.kind === 'expense' || t.kind === 'income' || t.kind === 'transfer') &&
    typeof t.amount === 'number' &&
    typeof t.categoryId === 'string' &&
    typeof t.date === 'string'
  )
}

function isCategory(v: unknown): v is Category {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.label === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.color === 'string'
  )
}

/** Parses and validates a backup file. Throws a friendly error if invalid. */
export function parseBackup(text: string): BackupData {
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^﻿/, '')) // tolerate a stray BOM
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.')
  }
  const d = raw as Partial<BackupData>
  if (!d || d.app !== 'dindin' || !Array.isArray(d.transactions) || !Array.isArray(d.categories)) {
    throw new Error('Este arquivo não parece ser um backup do DinDin.')
  }
  const transactions = d.transactions.filter(isTransaction)
  const categories = d.categories.filter(isCategory)
  return {
    app: 'dindin',
    version: typeof d.version === 'number' ? d.version : BACKUP_VERSION,
    exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : '',
    transactions,
    categories,
    lastDate: typeof d.lastDate === 'string' ? d.lastDate : undefined,
  }
}
