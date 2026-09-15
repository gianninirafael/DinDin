# DinDin — personal finance app

DinDin is a **personal** expense/income tracker. One user (the owner), no auth,
no server. It's inspired by a simple category-based expense manager but rebuilt
with a cleaner, bolder UI. Portuguese (pt-BR) is the primary language.

## Product

- Track **expenses**, **income**, and **transfers**, each tagged with a category.
- Add flow: pick kind → pick category (icon grid) → type amount on a keypad →
  optional note → save.
- Home shows a per-month summary (Despesas / Receitas / Saldo) and a list of
  transactions grouped by day.
- Charts screen breaks down the month's expenses by category.
- Data is **private and local** to the device (IndexedDB). No accounts, no
  network calls, nothing leaves the browser.

## Platform & priorities

- **Mobile-first web app / PWA.** The owner uses it primarily on a phone;
  desktop should still look good but phone layout wins any trade-off.
- Design in a `max-w-lg` centered column so it reads like a native phone app on
  any screen.

## Design language

**Dark theme, Wise-inspired**, with a high-contrast **yellow** accent (the owner
explicitly chose yellow over Wise's neon green). Strong contrast, big bold
numbers, generous spacing, pill buttons, layered near-black surfaces.

- **Money is the hero.** Large, extra-bold, `tabular-nums` (use the `.tnum`
  class). Home leads with the month balance in a big number.
- Dark surfaces from `ink.*`: `ink` (#0b0c0e app bg), `ink-soft` (cards),
  `ink-muted` (inputs/chips), `ink-line` (hairlines). Text is white / neutral-500.
- Accent = `brand.*` in `tailwind.config.js` — a punchy yellow. **Always put
  dark text on yellow** (`text-black`), never white. Change the palette there to
  re-theme the whole app in one place.
- Semantic amounts: expense = white or `rose-400` with `−`, income =
  `emerald-400` with `+`. Yellow is reserved for the brand/primary actions, not
  for income.
- Category color bubbles: icon on a tinted circle (`color + '33'` on dark).
- Rounded corners: `rounded-card` (20px) for cards, full rounds for bubbles,
  pills/chips for buttons and toggles.
- Font: **Manrope**, self-hosted via `@fontsource-variable/manrope` (imported in
  `main.tsx`) — no external font request, so it respects the "nothing leaves the
  browser" rule. Set in `tailwind.config.js` `fontFamily.sans`.
- **Home stays lean for daily entry:** the top-left **☰ menu** holds all the
  secondary tools (Contas, Caixinhas, Desejos, Hábitos) plus Dados e backup.
  Home itself is just the month hero + Despesas/Receitas + the day list; the
  `PendingAlert` banner is the one exception that surfaces there.

When the owner shares more Wise screenshots, match spacing/typography/contrast
from them — treat those as the source of truth for visual polish.

## Tech stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v3** (config in `tailwind.config.js`)
- **Zustand** for state (`src/store.ts`)
- **idb** wrapper over IndexedDB (`src/lib/db.ts`)
- **Recharts** for the charts screen

## Project map

```
src/
  types.ts              Transaction / Category / TxKind types
  store.ts              Zustand store + derived selectors (month totals etc.)
  data/categories.ts    Seed categories (pt-BR) + CATEGORY_MAP lookup
  lib/
    db.ts               IndexedDB CRUD (openDB, load/put/delete)
    format.ts           BRL currency + pt-BR date formatting helpers
  components/
    Home.tsx            Month summary + day-grouped list; tap a row to edit it
    Charts.tsx          Expense-by-category donut + breakdown
    AddSheet.tsx        Full-screen add/edit flow (tabs, category grid, keypad)
    CategoryEditor.tsx  Create/edit/delete a category (name, emoji, color, kind)
    ReorderSheet.tsx    Popup list to reorder categories (up/down, per kind)
  App.tsx               Shell: bottom nav, month picker, add button
```

## Conventions

- All amounts are stored **positive**; the sign shown to the user is derived
  from `kind` (expense = red/minus, income = green/plus).
- Currency is BRL, formatted via `src/lib/format.ts` — never hand-format money.
- Dates are ISO `yyyy-mm-dd` strings; the active month is a `yyyy-mm` key.
  Show dates to the user as **dd/mm/yyyy** via `formatDMY()`. The Add sheet
  picks dates with a hidden native `<input type="date">` opened by the Data
  button (`showPicker()`).
- **Sticky date:** new entries default to the last date the owner used
  (persisted in `localStorage` as `dindin.lastDate` and mirrored in the store),
  not to today — a deliberate time-saver for entering a batch on one day.
- Category order is a per-category `order` field; reorder via `moveCategory`
  (swaps neighbours) in the ReorderSheet. Reordering is scoped to the current
  kind (expense/income), which also includes `both` categories.
- **Categories live in IndexedDB** (a `categories` store), seeded once from
  `src/data/categories.ts` on first run. After that they're managed **in-app**
  from the Add sheet ("Editar" toggle → tap to edit, or the "Nova" tile to
  create). Edit `src/data/categories.ts` only to change the initial seed for
  fresh installs. Look categories up via the `useCategoryMap()` hook in
  `store.ts`, never by importing the seed array. Icons are emoji.
- Deleting a category leaves old transactions pointing at a missing id; the UI
  renders a `❓` / "Sem categoria" fallback for those — keep that graceful.
- Tapping a transaction opens the Add sheet in **edit** mode (`editing` prop);
  the same sheet handles create, update, and delete.
- Keep everything client-side. Do not add network requests, analytics, or any
  code that transmits the owner's financial data — **with one opt-in exception:
  voice entry** (below). Never add other network calls.
- **Voice entry** (`components/VoiceSheet.tsx`, `lib/gemini.ts`, `lib/audio.ts`):
  the owner records audio (mic → MediaRecorder), it's transcoded to 16 kHz mono
  WAV (`toWavMono16k`) and sent to the **Gemini API** with the owner's own key
  to transcribe + structure into rows (name / amount / date / kind / categoryId).
  A review screen lets them fix everything and pick categories, then
  `addTransactions` bulk-saves. This is the ONLY network call in the app and
  only fires when the owner records. The Gemini key lives in `localStorage`
  (`dindin.geminiKey`) — never hard-code it, never send it anywhere but Google.
  Reached via the 🎙️ button (secondary FAB above the nav).
- **Backup/restore & export** live in the top-left "Dados" menu (`App.tsx`):
  CSV export (`lib/export.ts`), full JSON backup, and JSON restore
  (`lib/backup.ts`). Restore is an **upsert by id** via `importBackup` — safe
  and idempotent (re-importing never duplicates). `downloadFile` adds a UTF-8
  BOM for CSV only, never for JSON, and `parseBackup` strips a stray BOM.
  The JSON backup is the owner's safety net since data is device-local.

## Commands

```
npm run dev      # local dev server
npm run build    # typecheck (tsc -b) + production build
npm run preview  # preview the built app
```

Always run `npm run build` before committing — it typechecks the whole project.

## v1 / v2 deployment

Two live builds from this one repo, both on GitHub Pages (same origin):
- **v1 (stable)** = `main` branch → site root `/DinDin/`. Frozen for daily use.
- **v2 (dev)** = `v2` branch → `/DinDin/v2/`, built with `VITE_DINDIN_NS=dindin_v2`
  so its IndexedDB + localStorage are fully separate from v1 (see `lib/ns.ts`).
- The deploy workflow (on `main` + manual dispatch) builds both. To publish v2:
  push the `v2` branch, then dispatch the `deploy.yml` workflow on `main`.
- `APP_VARIANT` shows a small "V2" badge; keys default to `dindin` so v1 is
  untouched.

## v2 budgeting (Fase 1 + 2, on the `v2` branch)

- **Fase 1 — zero-based:** `Category.monthlyBudget` (recurring allocation),
  `availableToBudget` pool (localStorage via ns). `Budget.tsx` (Orçamento tab)
  shows pool, "a alocar", and per-category alocado/gasto/restante.
- **Fase 2 — daily cap:** `lib/budget.ts`. Flexible monthly = sum of budgets of
  cap-counting categories (`countsTowardDailyCap !== false`); split across the
  month's days with Fri/Sat weighted `WEEKEND_WEIGHT` (1.5). `Today.tsx` (Hoje
  tab) shows "posso gastar" for dia/semana/mês = teto − gasto (cap categories),
  day resets daily, week/month keep counting. Cap toggle set in the Budget sheet.
- **Fase 3 — caixinha mechanism:** `Caixinha` + `Pendencia` entities (DB v3,
  stores `caixinhas`/`pendencias`). `Caixinhas.tsx` (opened from the ☰ menu):
  create/edit (acumulativa / alvo_fixo / meta_com_prazo), "Guardar agora"
  (direct `depositToCaixinha`) or "Guardar depois" (`createPendencia`).
  `PendingAlert.tsx` is the persistent home banner for pending pendências;
  `confirmPendencia` moves the value into the caixinha, `dismissPendencia`
  drops it. Reused later for reembolso / sobra / resistência (Fase 4-5).
- **Fase 4 — features on the mechanism:**
  - *Reembolsável*: `Transaction.reimbursable/reimbursed`. AddSheet toggle (expense)
    creates a `reembolso` pendência (`transactionId`). Confirming marks the tx
    `reimbursed` (excluded from all spend math — `monthTotals`,
    `monthSpendByCategory`, `spendInRange`) and adds the amount back to
    `availableToBudget`. Home tags rows "a receber" / "reembolsado".
  - *Sobra*: on Hoje, when the period has leftover, "Guardar sobra" → pick a
    caixinha → creates a `sobra` pendência.
  - *Carteira semanal física*: `weeklyWallet` (localStorage via ns). When set it
    is the source of truth on Hoje — day teto = weekly/7, week = weekly, month ≈
    weekly·days/7; overspend offers a "repor" `estouro` pendência.
- **Fase 5 — Hábitos (experimental, self-contained):** `Habit` + `HabitEntry`
  (DB v4, stores `habits`/`habitEntries`). Kept OUT of the main UI — reached via
  a "Hábitos (beta)" row in the top-left "Dados" menu. `Habits.tsx`: create a
  habit (name, emoji, unit price, optional resistência caixinha); "+1 comprei" /
  "Compra composta" log `buy` entries; per-habit accumulated spend, unit count,
  annual projection (lifetime daily rate ×365) and clean-days streak. "Resisti"
  logs a `resist` entry and opens a `resistencia` pendência to the linked
  caixinha. Habit data does NOT touch transactions or the budget math.
- **Fase 6 — Planejamento:** `FixedBill` (DB v5, store `fixedBills`) +
  `Planejar.tsx`, a full-screen overlay opened from a "🗓️ Planejar" button on
  the Orçamento header. Four sections: (a) *Renda irregular* — "dias cobertos" =
  `availableToBudget` ÷ avg daily expense of the last 30 days (irregular-income
  runway); (b) *Simulador de projeto* — custo total + prazo (meses) → aporte
  mensal, compared against "sobra pra alocar" (`availableToBudget −
  totalBudgeted`); "Criar meta rastreável" saves a `meta_com_prazo` caixinha
  (target = custo, deadline = today + prazo months); (c) *Contas fixas* — list +
  bottom-sheet editor (`saveFixedBill`/`removeFixedBill`, sorted by `dueDay`),
  monthly total; (d) *Checkpoint semanal* — week teto/gasto/sobra from
  `budget.ts` (respects `weeklyWallet`) + open-pendência count, a Sunday-ritual
  prompt. Read-only over existing state except the two writes named.
- **Fase 7 — Atrito (anti-impulso):** three self-contained frictions.
  - *Tag impulso:* `Transaction.impulse` — a second AddSheet toggle (expense,
    next to Reembolsável, rose-tinted). Home tags such rows "impulso".
    `monthImpulse(txs, monthKey)` sums flagged expenses (excludes reimbursed);
    shown on the Desejos screen. Purely a label — no effect on budget/cap math.
  - *Desejos + pausa 24h:* `Desejo` (DB v6, store `desejos`) + `Desejos.tsx`,
    opened from the ☰ menu. Add name+valor → starts `aberto` and
    paused; `DESEJO_COOLDOWN_MS` (24h) must pass (`releaseAt`) before you can
    decide. `decideDesejo` sets `comprei` or `deixei_passar` — no transaction is
    created (buys are logged normally; letting go counts as saved). Home card +
    hero show "economizei deixando passar" = Σ amount of `deixei_passar`.
  - *Custo em horas:* `hourlyRate` (localStorage via ns, set in the Desejos rate
    sheet). Each desejo shows "≈ Xh de trabalho" = amount ÷ hourlyRate.
  Nothing here touches transaction or budget math beyond the additive
  `impulse` flag.
- **Fase 8 — Múltiplas contas:** `Account` (DB v7, store `accounts`) +
  `Transaction.accountId` (origem) & `toAccountId` (transfer destino).
  - A default account (`DEFAULT_ACCOUNT_ID`, "Carteira") is seeded on first run;
    transactions saved before Fase 8 (no `accountId`) count toward it, so nothing
    breaks. New entries carry an explicit `accountId` (sticky via `lastAccountId`
    in localStorage, mirrored in the store — same idea as the sticky date).
  - `accountBalance(acc, txs)` = openingBalance + income − expense (reimbursed
    nets to zero) + transfers in − transfers out. `netWorth(accounts, txs)` sums
    non-archived accounts. Transfers move money between two accounts and never
    touch `monthTotals` (they're not expense/income) — internal moves.
  - AddSheet: expense/income show an account chip strip (only when >1 account);
    the Transferência tab replaces the category grid with a De→Para account
    picker and requires `accountId !== toAccountId` (categoryId = '').
  - `Contas.tsx` (opened from the ☰ menu): patrimônio hero + per-
    account balance, create/edit sheet (name, emoji, color, saldo inicial). The
    default account can't be deleted. Home renders transfers as "⇄ De → Para",
    neutral, uncounted. Wise / Nubank PJ / Nubank PF are the intended accounts.
  - **Início account switcher (one-app-at-a-time flow):** `homeAccount`
    (store-only, not persisted; null = "Visão geral") drives a chip row atop the
    Home — shown only when >1 account. Selecting an account scopes **only the
    Home** (month hero, Despesas/Receitas, day list) to it via
    `txBelongsToAccount` (transfers show for origem OR destino; legacy no-account
    rows fall to the default account); Orçamento/teto and Gráficos stay global.
    The scoped hero shows "Saldo do mês · <conta>" plus a "Saldo atual da conta"
    line. Being "in" an account also makes new entries land there: App passes
    `homeAccount` as `defaultAccountId` to AddSheet (overrides `lastAccountId`)
    and to VoiceSheet (stamps every dictated row's `accountId`, shown as "Vai
    para a conta X" on the review). Visão geral falls back to `lastAccountId`.

## Roadmap / not built yet

- Reports screen, search, calendar view, budgets/goals.
- Optional cloud sync (data is device-local; JSON backup is the manual bridge).
- Installable PWA manifest + service worker.
```
