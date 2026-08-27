export type TxKind = 'expense' | 'income' | 'transfer'

export interface Category {
  id: string
  label: string
  icon: string // lucide-style key we map to an emoji/glyph for now
  color: string // hex used for the icon bubble
  kind: TxKind | 'both'
}

export interface Transaction {
  id: string
  kind: TxKind
  amount: number // always positive; sign is derived from kind
  categoryId: string
  note?: string
  date: string // ISO yyyy-mm-dd
  createdAt: number
}
