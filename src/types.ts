export type TxKind = 'expense' | 'income' | 'transfer'

export interface Category {
  id: string
  label: string
  icon: string // emoji glyph shown in the bubble
  color: string // hex used for the icon bubble
  kind: TxKind | 'both'
  order?: number // sort position within the picker
  monthlyBudget?: number // recurring monthly allocation (zero-based), BRL; undefined = unbudgeted
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
