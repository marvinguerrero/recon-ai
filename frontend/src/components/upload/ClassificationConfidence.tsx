/** Shows a mini progress bar and percentage for a classification confidence score (0–1). */
export function ClassificationConfidence({ confidence }: { confidence: number }) {
  if (!confidence || confidence <= 0) return null

  const pct = Math.round(confidence * 100)
  const barColor =
    pct >= 66
      ? 'bg-emerald-500 dark:bg-emerald-400'
      : pct >= 33
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-zinc-400 dark:bg-zinc-500'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <span
          className={`block h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      {pct}%
    </span>
  )
}
