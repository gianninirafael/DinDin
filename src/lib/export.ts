import type { Transaction, Category } from '../types'
import { formatDMY } from './format'

const KIND_LABEL: Record<Transaction['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
}

/** Signed value for spreadsheets: expenses/transfers out are negative. */
function signedValue(t: Transaction): number {
  return t.kind === 'income' ? t.amount : -t.amount
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/**
 * Builds a CSV that Google Sheets / Excel import cleanly:
 * comma-separated, dd/mm/yyyy dates, dot-decimal numeric values.
 */
export function buildCSV(txs: Transaction[], catMap: Record<string, Category>): string {
  const header = ['Data', 'Tipo', 'Categoria', 'Nota', 'Valor']
  const rows = [...txs]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)))
    .map((t) => [
      formatDMY(t.date),
      KIND_LABEL[t.kind],
      catMap[t.categoryId]?.label ?? 'Sem categoria',
      t.note ?? '',
      signedValue(t).toFixed(2),
    ])

  return [header, ...rows].map((cols) => cols.map(escapeCell).join(',')).join('\r\n')
}

/** Triggers a browser download of the given text as a file. */
export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  // A UTF-8 BOM helps Excel open accented pt-BR text, but must NOT go into
  // JSON (it would break JSON.parse on restore). Add it for CSV only.
  const body = mime.includes('csv') ? '﻿' + content : content
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
