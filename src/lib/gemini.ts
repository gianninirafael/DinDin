import type { TxKind } from '../types'

// Voice entry uses Gemini to transcribe a spoken audio and structure it into
// rows. This is the ONE place the app talks to the network, and only when the
// owner records audio — the audio (and their API key) go to Google. Opt-in.

const KEY_STORAGE = 'dindin.geminiKey'
const MODEL = 'gemini-flash-latest'
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(KEY_STORAGE, key.trim())
  } catch {
    // ignore storage failures
  }
}

export interface ParsedRow {
  name: string
  amount: number
  date: string // ISO yyyy-mm-dd
  kind: TxKind
  categoryId: string | null
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = reader.result as string
      resolve(s.slice(s.indexOf(',') + 1)) // strip "data:...;base64,"
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      amount: { type: 'NUMBER' },
      date: { type: 'STRING' },
      kind: { type: 'STRING', enum: ['expense', 'income', 'transfer'] },
      categoryId: { type: 'STRING' },
    },
    required: ['name', 'amount', 'date', 'kind'],
  },
}

function buildPrompt(categories: { id: string; label: string }[], todayISO: string): string {
  const list = categories.map((c) => `- ${c.id}: ${c.label}`).join('\n')
  return [
    'Você recebe um áudio em português (pt-BR) onde a pessoa lista gastos e receitas,',
    'geralmente no formato "nome - valor - data", uma por linha, podendo ter pausas.',
    'Extraia cada lançamento como um objeto JSON.',
    '',
    'Regras:',
    `- Hoje é ${todayISO}. Converta datas faladas ("hoje", "ontem", "anteontem", "dia 5", "sexta") para o formato ISO yyyy-mm-dd. Se a data não for dita, use hoje.`,
    '- "amount" é um número positivo em reais (ex.: "quarenta e cinco e noventa" ou "45 e 90" => 45.90). Sempre positivo.',
    '- "kind" é "expense" por padrão; use "income" se a pessoa disser que recebeu/entrou dinheiro (salário, pagamento, recebi).',
    '- "name" é uma descrição curta do lançamento (o que foi comprado/recebido).',
    '- "categoryId": escolha o id da categoria que melhor combina com o nome, da lista abaixo. Se nada combinar, deixe vazio.',
    '',
    'Categorias disponíveis (id: nome):',
    list,
    '',
    'Responda APENAS com o array JSON, sem texto extra.',
  ].join('\n')
}

/** Sends the recorded audio to Gemini and returns structured rows. */
export async function transcribeAudio(
  blob: Blob,
  opts: { categories: { id: string; label: string }[]; todayISO: string; mimeType: string },
): Promise<ParsedRow[]> {
  const key = getApiKey()
  if (!key) throw new Error('Cole sua chave do Gemini primeiro.')

  const base64 = await blobToBase64(blob)
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: opts.mimeType, data: base64 } },
          { text: buildPrompt(opts.categories, opts.todayISO) },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT(MODEL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Sem conexão com o Gemini. Verifique a internet.')
  }

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || ''
    } catch {
      // ignore
    }
    if (res.status === 400 && /API key/i.test(detail)) throw new Error('Chave do Gemini inválida.')
    if (res.status === 429) throw new Error('Limite do Gemini atingido. Tente de novo em alguns minutos.')
    throw new Error(`Gemini falhou (${res.status}). ${detail}`.trim())
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('O Gemini não retornou nada. Tente gravar de novo.')

  let rows: unknown
  try {
    rows = JSON.parse(text)
  } catch {
    throw new Error('Resposta do Gemini em formato inesperado.')
  }
  if (!Array.isArray(rows)) throw new Error('Resposta do Gemini em formato inesperado.')

  const validIds = new Set(opts.categories.map((c) => c.id))
  return rows
    .map((r): ParsedRow | null => {
      const o = r as Record<string, unknown>
      const amount = typeof o.amount === 'number' ? o.amount : parseFloat(String(o.amount))
      if (!o.name || !isFinite(amount) || amount <= 0) return null
      const kind: TxKind =
        o.kind === 'income' || o.kind === 'transfer' ? (o.kind as TxKind) : 'expense'
      const cid = typeof o.categoryId === 'string' && validIds.has(o.categoryId) ? o.categoryId : null
      return {
        name: String(o.name).slice(0, 80),
        amount: Math.round(amount * 100) / 100,
        date: typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : opts.todayISO,
        kind,
        categoryId: cid,
      }
    })
    .filter((r): r is ParsedRow => r !== null)
}
