export type TxKind = 'expense' | 'income' | 'transfer'

export interface Category {
  id: string
  label: string
  icon: string // emoji glyph shown in the bubble
  color: string // hex used for the icon bubble
  kind: TxKind | 'both'
  order?: number // sort position within the picker
  monthlyBudget?: number // recurring monthly allocation (zero-based), BRL; undefined = unbudgeted
  countsTowardDailyCap?: boolean // false = fixed/excluded from the daily cap (default true)
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

// ---- Caixinha mechanism (Fase 3) ----

export type CaixinhaType = 'alvo_fixo' | 'acumulativa' | 'meta_com_prazo'

export interface Caixinha {
  id: string
  name: string
  icon: string // emoji
  color: string // hex bubble tint
  type: CaixinhaType
  balance: number // current saved amount
  target?: number // for alvo_fixo / meta_com_prazo
  deadline?: string // ISO yyyy-mm-dd, for meta_com_prazo
  order?: number
}

export type PendenciaOrigin = 'reembolso' | 'sobra' | 'resistencia' | 'estouro' | 'manual'

export interface Pendencia {
  id: string
  caixinhaId?: string // where the value lands when confirmed
  amount: number
  origin: PendenciaOrigin
  note?: string
  status: 'pendente' | 'confirmado'
  createdAt: number
}
