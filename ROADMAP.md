# DinDin — Build Roadmap

DinDin is evolving from a simple manual expense tracker into a **zero-based,
manual-control budgeting app** for a freelancer with irregular income and
compulsive-spending patterns. The full product spec lives in the owner's
deep-dive; this file is the build order and the decisions locked so far.

## Guiding principles (these decide most design calls)

1. **Manual control over automation.** The app never auto-decides; anything that
   moves real money is confirmed by the owner.
2. **A transfer is never an expense.** Cash withdrawal, sending to a caixinha,
   moving between accounts — all move balance, not category budget.
3. **Warn, don't block.** Overspending is a scoreboard of consequence, not a
   lock. The day resets each day and never borrows from tomorrow.
4. **Local and private.** All data stays on-device (IndexedDB). No accounts,
   no server, nothing leaves the browser.

## Locked decisions

- **Budget pool** = a manual "disponível para orçar" figure the owner sets and
  distributes (not derived from income transactions).
- **Category allocation** = a recurring default per category that carries over
  each month, which the owner can tweak.
- **Daily cap** = derived from the flexible monthly budget (sum of allocations
  of categories flagged `conta_pro_teto_diario`), split across the days of the
  month, with Fri/Sat weighted heavier than Sun–Thu.
- **Overspend flow** = a busted day resets the next day (no borrowing), but the
  overspend still reduces the week and month remaining (real money is gone).
- **Existing data** = keep current categories and transactions; layer budgeting
  on top rather than starting fresh.

## Phases

- **Fase 0 — Base (DONE).** Manual entry (expense/income/transfer), category
  CRUD + reorder, edit/delete transactions, date picker + sticky last-used date,
  dark + yellow UI, CSV export, GitHub Pages deploy.
- **Fase 1 — Zero-based foundation (NEXT).** "Disponível para orçar" figure;
  monthly allocation per category (recurring default, tweakable); category card
  showing alocado / gasto / restante. Delivers value on its own.
- **Fase 2 — Time + daily cap.** Month/week/day views; `conta_pro_teto_diario`
  flag per category; derived daily cap (Fri/Sat weighted); "posso gastar hoje" =
  block cap − spent today; overspend shown across all three views.
- **Fase 3 — Caixinha mechanism (build once, generic).** Caixinha + Pendência
  entities; persistent home alert until confirmed; event → pendência → manual
  confirmation → balance updates.
- **Fase 4 — Features on the mechanism.** Reimbursable transactions + refund
  discount; manual "sobra" to savings; physical weekly caixinha (releases the
  day's slice).
- **Fase 5 — Habits.** Unit counter + reference price + accumulated; composite
  purchase split; "resisti" → pendência; monthly/annual projection + streak.
- **Fase 6 — Planning.** Project simulator → meta-com-prazo caixinha; fixed-bills
  calendar; irregular-income budgeting ("dias cobertos"); weekly checkpoint.
- **Fase 7 — Optional / friction.** Voice entry (transcribe → parse → review);
  planned-vs-impulse tag; 24h pause above a threshold; cost in work-hours;
  wishlist (simple Keep). CSV export already done.
- **Fase 8 — Later.** Multiple accounts (Wise, Nubank PJ/PF) with manual
  balances; account-to-account transfer is neutral; separate "what the money is
  for" (category) from "where it physically is" (account).

## Open decisions (revisit at Fase 4+)

- Can the cash wallet go negative, or does the app flag an error?
- Topping up the wallet before it hits zero: a new withdrawal event or just add
  to the total?
- End-of-month category leftover: roll into next month or return to the general
  pool to re-allocate?
- Reimbursement caixinha target: fixed, or floating with the month's volume?
