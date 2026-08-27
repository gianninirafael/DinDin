import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useStore, useCategoryMap, monthTransactions } from '../store'
import { formatMoney, monthShort } from '../lib/format'

export default function Charts() {
  const { transactions, activeMonth } = useStore()
  const catMap = useCategoryMap()

  const data = useMemo(() => {
    const txs = monthTransactions(transactions, activeMonth).filter((t) => t.kind === 'expense')
    const byCat = new Map<string, number>()
    for (const t of txs) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount)
    return [...byCat.entries()]
      .map(([id, value]) => ({ id, value, cat: catMap[id] }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, activeMonth, catMap])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="mx-auto max-w-lg px-5 pb-28 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-white">Gráficos</h1>
      <p className="mt-1 text-sm text-neutral-500">Despesas de {monthShort(activeMonth)}.</p>

      {data.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">Sem despesas neste mês.</p>
      ) : (
        <>
          <div className="relative mx-auto mt-6 h-56 w-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={72}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.id} fill={d.cat?.color ?? '#ccc'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="text-xs text-neutral-500">Total</div>
                <div className="tnum text-lg font-bold text-white">{formatMoney(total)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {data.map((d) => {
              const pct = total ? Math.round((d.value / total) * 100) : 0
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-card bg-ink-soft px-3 py-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-base"
                    style={{ background: (d.cat?.color ?? '#666') + '33' }}
                  >
                    {d.cat?.icon ?? '❓'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[15px] font-medium text-white">
                      <span className="truncate">{d.cat?.label ?? d.id}</span>
                      <span className="tnum">{formatMoney(d.value)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: d.cat?.color ?? '#ccc' }}
                      />
                    </div>
                  </div>
                  <span className="tnum w-9 text-right text-xs text-neutral-500">{pct}%</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
