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
- Font: Inter.

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
    Home.tsx            Month summary + day-grouped transaction list
    Charts.tsx          Expense-by-category donut + breakdown
    AddSheet.tsx        Full-screen add flow (tabs, category grid, keypad)
  App.tsx               Shell: bottom nav, month picker, add button
```

## Conventions

- All amounts are stored **positive**; the sign shown to the user is derived
  from `kind` (expense = red/minus, income = green/plus).
- Currency is BRL, formatted via `src/lib/format.ts` — never hand-format money.
- Dates are ISO `yyyy-mm-dd` strings; the active month is a `yyyy-mm` key.
- Add categories by editing `src/data/categories.ts` (each needs a unique `id`,
  a `kind`, an emoji `icon`, and a `color`). Icons are emoji for now; a real
  icon set can replace them later.
- Keep everything client-side. Do not add network requests, analytics, or any
  code that transmits the owner's financial data.

## Commands

```
npm run dev      # local dev server
npm run build    # typecheck (tsc -b) + production build
npm run preview  # preview the built app
```

Always run `npm run build` before committing — it typechecks the whole project.

## Roadmap / not built yet

- Transfers are selectable but treated like a plain entry (no account model yet).
- Reports screen, search, calendar view, budgets/goals.
- Category management UI (add/edit/reorder from within the app).
- Editing an existing transaction (currently tap-to-delete only).
- Optional cloud sync / export-import.
- Installable PWA manifest + service worker.
```
