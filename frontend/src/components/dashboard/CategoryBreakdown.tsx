import type { SavedUploadRecord } from '../../api/uploadsLibrary'

type Category = 'receipt' | 'soa' | 'invoice' | 'uncategorized'

const CATEGORY_CONFIG: Record<
  Category,
  { label: string; bar: string; dot: string }
> = {
  receipt: {
    label: 'Receipt',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
    dot: 'bg-emerald-500',
  },
  soa: {
    label: 'SOA',
    bar: 'bg-sky-500 dark:bg-sky-400',
    dot: 'bg-sky-500',
  },
  invoice: {
    label: 'Invoice',
    bar: 'bg-violet-500 dark:bg-violet-400',
    dot: 'bg-violet-500',
  },
  uncategorized: {
    label: 'Uncategorized',
    bar: 'bg-zinc-300 dark:bg-zinc-600',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
  },
}

function CategoryRow({
  category,
  count,
  total,
}: {
  category: Category
  count: number
  total: number
}) {
  const cfg = CATEGORY_CONFIG[category]
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
      <span className="w-28 text-sm text-zinc-700 dark:text-zinc-300">{cfg.label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${cfg.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {count}
      </span>
      <span className="w-10 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

export function CategoryBreakdown({ records }: { records: SavedUploadRecord[] }) {
  const total = records.length

  const counts = {
    receipt: records.filter((r) => r.category === 'receipt').length,
    soa: records.filter((r) => r.category === 'soa').length,
    invoice: records.filter((r) => r.category === 'invoice').length,
    uncategorized: records.filter((r) => r.category === 'uncategorized').length,
  } as Record<Category, number>

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Category breakdown
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Distribution across {total} document{total !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="px-5 py-3">
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => (
          <CategoryRow key={cat} category={cat} count={counts[cat]} total={total} />
        ))}
      </div>
    </div>
  )
}
