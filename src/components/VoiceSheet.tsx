import { useEffect, useRef, useState } from 'react'
import type { TxKind } from '../types'
import { useStore } from '../store'
import { formatDMY, todayISO } from '../lib/format'
import { playClick, playConfirm } from '../lib/sound'
import { toWavMono16k, pickRecordingMime } from '../lib/audio'
import { getApiKey, setApiKey, transcribeAudio, type ParsedRow } from '../lib/gemini'

type Stage = 'key' | 'idle' | 'recording' | 'processing' | 'review' | 'error'

interface Row {
  name: string
  amountStr: string
  date: string
  kind: TxKind
  categoryId: string | null
}

const MAX_SECONDS = 15 * 60

function mmss(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function VoiceSheet({ onClose }: { onClose: () => void }) {
  const { categories, addTransactions } = useStore()
  const [stage, setStage] = useState<Stage>(getApiKey() ? 'idle' : 'key')
  const [keyInput, setKeyInput] = useState(getApiKey())
  const [seconds, setSeconds] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mimeRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function catOptions(kind: TxKind) {
    return categories.filter((c) => c.kind === kind || c.kind === 'both')
  }

  async function startRecording() {
    playClick()
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickRecordingMime()
      mimeRef.current = mime
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' })
        void processAudio(blob)
      }
      recorderRef.current = rec
      rec.start()
      setSeconds(0)
      setStage('recording')
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording()
          return s + 1
        })
      }, 1000)
    } catch {
      setError('Não consegui acessar o microfone. Permita o acesso e tente de novo.')
      setStage('error')
    }
  }

  function stopRecording() {
    playClick()
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setStage('processing')
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    playClick()
    setStage('processing')
    void processAudio(file)
  }

  async function processAudio(recorded: Blob) {
    try {
      const wav = await toWavMono16k(recorded)
      const parsed: ParsedRow[] = await transcribeAudio(wav, {
        categories: categories.map((c) => ({ id: c.id, label: c.label })),
        todayISO: todayISO(),
        mimeType: 'audio/wav',
      })
      if (parsed.length === 0) {
        setError('Não entendi nenhum lançamento no áudio. Tente falar mais pausado, no formato "nome, valor, data".')
        setStage('error')
        return
      }
      setRows(
        parsed.map((p) => ({
          name: p.name,
          amountStr: p.amount.toFixed(2).replace('.', ','),
          date: p.date,
          kind: p.kind,
          categoryId: p.categoryId,
        })),
      )
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao transcrever o áudio.')
      setStage('error')
    }
  }

  function patchRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i))
  }

  const parsedAmount = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  const missingCategory = rows.some((r) => !r.categoryId)
  const canConfirm = rows.length > 0 && !missingCategory && rows.every((r) => parsedAmount(r.amountStr) > 0)

  async function confirm() {
    if (!canConfirm) return
    const n = await addTransactions(
      rows.map((r) => ({
        kind: r.kind,
        amount: parsedAmount(r.amountStr),
        categoryId: r.categoryId as string,
        note: r.name.trim() || undefined,
        date: r.date,
      })),
    )
    playConfirm()
    onClose()
    setTimeout(() => window.alert(`${n} lançamento(s) adicionado(s) por voz.`), 50)
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-ink text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onClose} className="text-base text-neutral-300">
          Cancelar
        </button>
        <span className="text-lg font-semibold">Ditar contas</span>
        <span className="w-16" />
      </div>

      {/* KEY */}
      {stage === 'key' && (
        <div className="flex-1 overflow-y-auto px-6 pt-6">
          <p className="text-[15px] text-neutral-300">
            Pra transcrever seu áudio, cole sua chave do <b>Gemini</b> (grátis). Ela fica salva só
            neste aparelho.
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-brand-400 underline"
          >
            Pegar chave grátis no Google AI Studio →
          </a>
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Cole a chave aqui (AIza…)"
            className="mt-5 w-full rounded-2xl bg-ink-muted px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => {
              setApiKey(keyInput)
              if (keyInput.trim()) setStage('idle')
            }}
            disabled={!keyInput.trim()}
            className={`mt-4 w-full rounded-2xl py-4 text-base font-bold ${
              keyInput.trim() ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'
            }`}
          >
            Salvar chave
          </button>
        </div>
      )}

      {/* IDLE */}
      {stage === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="mb-2 text-[15px] text-neutral-300">
            Grave falando suas contas, uma por vez, mais ou menos assim:
          </p>
          <p className="mb-10 rounded-2xl bg-ink-soft px-4 py-3 text-sm text-neutral-400">
            “iFood, quarenta e cinco e noventa, hoje”<br />
            “Uber, vinte reais, ontem”<br />
            “Salário, dois mil e quinhentos, dia primeiro”
          </p>
          <button
            onClick={startRecording}
            className="grid h-24 w-24 place-items-center rounded-full bg-brand-500 text-4xl text-black shadow-lg shadow-brand-500/25 active:scale-95"
            aria-label="Gravar"
          >
            🎙️
          </button>
          <p className="mt-4 text-sm text-neutral-500">Toque para gravar</p>

          <div className="mt-8 flex items-center gap-3 text-neutral-600">
            <span className="h-px w-10 bg-ink-line" />
            <span className="text-xs">ou</span>
            <span className="h-px w-10 bg-ink-line" />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-full bg-ink-muted px-5 py-2.5 text-sm font-semibold text-white active:bg-ink-line"
          >
            📎 Enviar áudio do celular
          </button>
          <p className="mt-2 max-w-[26ch] text-xs text-neutral-600">
            Grave no gravador do celular e envie o arquivo — melhor para áudios longos.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={onPickFile}
            className="hidden"
          />
        </div>
      )}

      {/* RECORDING */}
      {stage === 'recording' && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="tnum text-5xl font-extrabold">{mmss(seconds)}</div>
          <p className="mt-2 text-sm text-neutral-500">Gravando… fale as contas pausadamente</p>
          <button
            onClick={stopRecording}
            className="mt-10 grid h-24 w-24 place-items-center rounded-full bg-rose-500 text-3xl text-white shadow-lg active:scale-95"
            aria-label="Parar"
          >
            ⏹
          </button>
          <p className="mt-4 text-sm text-neutral-500">Toque para parar e organizar</p>
        </div>
      )}

      {/* PROCESSING */}
      {stage === 'processing' && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-ink-line border-t-brand-500" />
          <p className="mt-6 text-[15px] text-neutral-300">Transcrevendo e organizando…</p>
          <p className="mt-1 text-sm text-neutral-500">pode levar alguns segundos</p>
        </div>
      )}

      {/* ERROR */}
      {stage === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-4xl">😕</div>
          <p className="mt-4 text-[15px] text-neutral-200">{error}</p>
          <div className="mt-8 flex gap-3">
            <button onClick={() => setStage('idle')} className="rounded-2xl bg-brand-500 px-6 py-3 font-bold text-black">
              Tentar de novo
            </button>
            <button onClick={() => setStage('key')} className="rounded-2xl bg-ink-muted px-6 py-3 font-semibold text-white">
              Trocar chave
            </button>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {stage === 'review' && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <p className="px-1 pb-2 text-sm text-neutral-400">
              Confira os {rows.length} lançamentos, ajuste o que precisar e escolha a categoria.
            </p>
            <div className="space-y-2">
              {rows.map((r, i) => {
                const opts = catOptions(r.kind)
                return (
                  <div key={i} className="rounded-2xl bg-ink-soft p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={r.name}
                        onChange={(e) => patchRow(i, { name: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg bg-ink-muted px-2.5 py-2 text-[15px] font-medium outline-none"
                      />
                      <input
                        value={r.amountStr}
                        onChange={(e) => patchRow(i, { amountStr: e.target.value })}
                        inputMode="decimal"
                        className={`tnum w-24 rounded-lg bg-ink-muted px-2.5 py-2 text-right text-[15px] font-semibold outline-none ${
                          r.kind === 'income' ? 'text-emerald-400' : 'text-white'
                        }`}
                      />
                      <button
                        onClick={() => removeRow(i)}
                        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-neutral-500 active:bg-ink-muted"
                        aria-label="Remover"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={r.kind}
                        onChange={(e) => patchRow(i, { kind: e.target.value as TxKind, categoryId: null })}
                        className="rounded-lg bg-ink-muted px-2 py-2 text-sm outline-none"
                      >
                        <option value="expense">Despesa</option>
                        <option value="income">Receita</option>
                      </select>
                      <select
                        value={r.categoryId ?? ''}
                        onChange={(e) => patchRow(i, { categoryId: e.target.value || null })}
                        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-sm outline-none ${
                          r.categoryId ? 'bg-ink-muted text-white' : 'bg-brand-500/15 text-brand-400'
                        }`}
                      >
                        <option value="">Categoria?</option>
                        {opts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => e.target.value && patchRow(i, { date: e.target.value })}
                        className="rounded-lg bg-ink-muted px-2 py-2 text-sm outline-none"
                        aria-label={`Data (${formatDMY(r.date)})`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="border-t border-ink-line px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {missingCategory && (
              <p className="mb-2 text-center text-xs text-brand-400">Escolha a categoria dos itens em amarelo.</p>
            )}
            <button
              onClick={confirm}
              disabled={!canConfirm}
              className={`w-full rounded-2xl py-4 text-base font-bold ${
                canConfirm ? 'bg-brand-500 text-black' : 'bg-ink-muted text-neutral-600'
              }`}
            >
              Adicionar {rows.length} lançamento{rows.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
