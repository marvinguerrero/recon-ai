const STYLES: Record<string, string> = {
  receipt:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
  soa: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30',
  invoice:
    'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/30',
  uncategorized:
    'bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-400 dark:ring-zinc-400/25',
}

const LABELS: Record<string, string> = {
  receipt: 'Receipt',
  soa: 'SOA',
  invoice: 'Invoice',
  uncategorized: 'Uncategorized',
}

export function DocumentCategoryBadge({ category }: { category: string }) {
  const styles = STYLES[category] ?? STYLES.uncategorized
  const label = LABELS[category] ?? category
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  )
}
