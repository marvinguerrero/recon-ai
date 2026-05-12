type StatCardProps = {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
        )}
      </div>
    </div>
  )
}
