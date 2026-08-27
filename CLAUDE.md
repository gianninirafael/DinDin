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
- **Voice entry** (dictate "nome - valor - data" lines to add many at once).
- **Export to Google Sheets / CSV.**
- Optional cloud sync.
- Installable PWA manifest + service worker.
```
