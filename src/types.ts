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
  categoryId: string // '' for transfers (no category)
  note?: string
  date: string // ISO yyyy-mm-dd
  createdAt: number
  reimbursable?: boolean // expense the owner expects to be paid back
  reimbursed?: boolean // reimbursement received → excluded from net spend
  impulse?: boolean // flagged as an impulse buy (Fase 7 — atrito)
  accountId?: string // account the money moved in/out of (Fase 8); for transfer = origem
  toAccountId?: string // transfer destination account (Fase 8)
}

// ---- Contas (Fase 8 — múltiplas contas) ----

export interface Account {
  id: string
  name: string // "Wise", "Nubank PJ", "Nubank PF"
  icon: string // emoji
  color: string // hex bubble tint
  openingBalance: number // balance the account started with when added
  order?: number
  archived?: boolean // hidden from pickers/summary but kept for history
}

// ---- Desejos / lista de espera (Fase 7 — atrito) ----

export interface Desejo {
  id: string
  name: string
  amount: number // estimated cost
  note?: string
  createdAt: number
  releaseAt: number // when the pause lifts (createdAt + cooldown)
  status: 'aberto' | 'comprei' | 'deixei_passar'
  decidedAt?: number
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

// ---- Contas fixas (Fase 6) ----

export interface FixedBill {
  id: string
  name: string
  amount: number
  dueDay: number // day of month 1..31
  order?: number
}

// ---- Hábitos (Fase 5, experimental, self-contained) ----

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  unitPrice: number // reference price per unit (BRL)
  caixinhaId?: string // resistência target
  order?: number
}

export interface HabitEntry {
  id: string
  habitId: string
  units: number
  amount: number // units * unitPrice at the time
  kind: 'buy' | 'resist'
  date: string // ISO yyyy-mm-dd
  createdAt: number
}

export type PendenciaOrigin = 'reembolso' | 'sobra' | 'resistencia' | 'estouro' | 'manual'

export interface Pendencia {
  id: string
  caixinhaId?: string // where the value lands when confirmed
  transactionId?: string // for reembolso: the expense being paid back
  amount: number
  origin: PendenciaOrigin
  note?: string
  status: 'pendente' | 'confirmado'
  createdAt: number
}
