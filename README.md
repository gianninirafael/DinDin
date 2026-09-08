# DinDin 💸

A **personal** finance tracker — log expenses, income, and transfers by
category, see a monthly summary, and break spending down in charts. Mobile-first
web app, Wise-inspired UI, all data stored privately on-device (IndexedDB).

## Stack

Vite · React 19 · TypeScript · Tailwind CSS · Zustand · idb · Recharts

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## How it works

- **Add** (+ button): choose Despesa / Receita / Transferência, pick a category,
  type the amount on the keypad, add an optional note, save.
- **Início**: monthly Despesas / Receitas / Saldo, plus transactions grouped by
  day. Tap a row to delete it.
- **Gráficos**: this month's expenses broken down by category.
- Switch months with the picker (top-right).

Data never leaves your browser — it lives in IndexedDB on your device.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.
