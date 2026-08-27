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

Inspired by **Wise**: strong contrast, big bold numbers, generous spacing,
clean rounded cards on a light background. NOT locked to Wise's green — the
accent lives in one place and is easy to reswap.

- **Money is the hero.** Large, bold, `tabular-nums` (use the `.tnum` class).
- Light UI surfaces (`neutral-50` bg, white cards, `shadow-card`), except the
  Add sheet which is a full-screen **dark** panel like the reference.
- Accent color = `brand.*` in `tailwind.config.js`. Change the palette there to
  re-theme the whole app.
- Category color bubbles: icon on a tinted circle (`color + '55'`).
- Rounded corners: `rounded-card` (20px) for cards, full rounds for bubbles/chips.
- Font: Inter.

When the owner shares Wise screenshots, match spacing/typography/contrast from
them — treat those as the source of truth for visual polish.

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
