import { useState } from 'react'

type MatchedKeywords = {
  primary: string[]
  secondary: string[]
  negative: string[]
}

// ─── Keyword chip ──────────────────────────────────────────────────────────────

const CHIP_STYLES = {
  primary:
    'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
  secondary:
    'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800',
  negative:
    'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800',
}

function KeywordChip({
  label,
  variant,
}: {
  label: string
  variant: keyof typeof CHIP_STYLES
}) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[0.65rem] font-medium ring-1 ring-inset ${CHIP_STYLES[variant]}`}
    >
      {label}
    </span>
  )
}

// ─── Row inside the expanded panel ────────────────────────────────────────────

function KeywordRow({
  label,
  keywords,
  variant,
}: {
  label: string
  keywords: string[]
  variant: keyof typeof CHIP_STYLES
}) {
  if (keywords.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      {keywords.map((kw) => (
        <KeywordChip key={kw} label={kw} variant={variant} />
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MatchedKeywordsDebug({
  matchedKeywords,
}: {
  matchedKeywords: MatchedKeywords | undefined
}) {
  const [expanded, setExpanded] = useState(false)

  if (!matchedKeywords) return null

  const { primary, secondary, negative } = matchedKeywords
  const total = primary.length + secondary.length + negative.length

  if (total === 0) return null

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {/* Fingerprint / signal icon */}
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2ZM5.404 5.404A6.5 6.5 0 0 1 16.165 12.5a.75.75 0 0 1-1.415.5 5 5 0 0 0-9.5 0 .75.75 0 0 1-1.415-.5 6.5 6.5 0 0 1 1.569-7.096ZM10 7a3 3 0 0 0-2.906 2.27.75.75 0 0 1-1.457-.358A4.5 4.5 0 0 1 14.5 10a.75.75 0 0 1-1.5 0A3 3 0 0 0 10 7Z"
              clipRule="evenodd"
            />
          </svg>
          Classification signals
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[0.65rem] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {total} matched
          </span>
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-zinc-200/80 px-3 py-2.5 dark:border-zinc-700/80">
          <KeywordRow label="Primary" keywords={primary} variant="primary" />
          <KeywordRow label="Secondary" keywords={secondary} variant="secondary" />
          <KeywordRow label="Negative" keywords={negative} variant="negative" />
        </div>
      )}
    </div>
  )
}
