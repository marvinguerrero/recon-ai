import type { SavedUploadRecord } from '../../api/uploadsLibrary'
import { StatCard } from './StatCard'
import { CategoryBreakdown } from './CategoryBreakdown'
import { TransactionLedger } from '../transactions'

// ─── Icons ─────────────────────────────────────────────────────────────────────

const Icons = {
  docs: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
    </svg>
  ),
  classified: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  amount: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.987a2.72 2.72 0 0 0-.516.186 1.199 1.199 0 0 0-.4.314.7.7 0 0 0-.154.437c0 .359.301.64.15.932Z" />
      <path
        fillRule="evenodd"
        d="M9.75 4a.75.75 0 0 1 .75.75V6a4.5 4.5 0 0 1 1.88 1.14.75.75 0 1 1-1.125.995 3 3 0 0 0-1.755-.635v2.593l.072.024c.538.18 1.128.455 1.604.835.508.407.824.968.824 1.658 0 .69-.316 1.25-.824 1.658-.476.38-1.066.655-1.604.835l-.072.024V16.25a.75.75 0 0 1-1.5 0V15a4.5 4.5 0 0 1-1.88-1.14.75.75 0 1 1 1.125-.995 3 3 0 0 0 1.755.635V10.88l-.07-.023c-.539-.18-1.13-.455-1.606-.835C6.315 9.59 6 9.029 6 8.34c0-.69.316-1.25.824-1.658.476-.38 1.066-.655 1.604-.835l.072-.024V4.75A.75.75 0 0 1 9.75 4Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  merchants: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V3.5h-.5A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM8 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM8.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM14.25 6a.75.75 0 0 0-.75.75V17a1 1 0 0 0 1 1h3.75a.75.75 0 0 0 .75-.75v-7a.75.75 0 0 0-.75-.75h-2v-2.5a.75.75 0 0 0-.75-.75h-1.25Z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

// ─── Derived stats ──────────────────────────────────────────────────────────────

function computeStats(records: SavedUploadRecord[]) {
  const total = records.length
  const classified = records.filter((r) => r.category !== 'uncategorized').length

  const allTransactions = records.flatMap((r) => r.transactions ?? [])

  const txWithAmount = allTransactions.filter(
    (tx) => typeof tx.amount === 'number' && isFinite(tx.amount),
  )
  const totalAmount = txWithAmount.reduce((s, tx) => s + tx.amount!, 0)

  // Use the most common currency across all transactions.
  const currencyFreq: Record<string, number> = {}
  allTransactions.forEach((tx) => {
    if (tx.currency) currencyFreq[tx.currency] = (currencyFreq[tx.currency] ?? 0) + 1
  })
  const dominantCurrency =
    Object.entries(currencyFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const uniqueMerchants = new Set(
    allTransactions.map((tx) => tx.merchant).filter(Boolean),
  ).size

  return { total, classified, totalAmount, dominantCurrency, txWithAmount: txWithAmount.length, uniqueMerchants }
}

// ─── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onNavigateToIngest }: { onNavigateToIngest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <svg
          className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
        </svg>
      </div>
      <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        No documents yet
      </h2>
      <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Upload receipts, invoices, or statements on the Ingest tab and they'll appear here.
      </p>
      <button
        type="button"
        onClick={onNavigateToIngest}
        className="mt-6 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"
      >
        Go to Ingest
      </button>
    </div>
  )
}

// ─── Main view ──────────────────────────────────────────────────────────────────

type DashboardViewProps = {
  records: SavedUploadRecord[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onNavigateToIngest: () => void
}

export function DashboardView({
  records,
  loading,
  error,
  onRefresh,
  onNavigateToIngest,
}: DashboardViewProps) {
  const stats = computeStats(records)

  const totalAmountDisplay =
    stats.txWithAmount > 0
      ? `${stats.dominantCurrency ? stats.dominantCurrency + ' ' : ''}${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—'

  if (loading && records.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-zinc-500">Loading dashboard…</p>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/30 dark:bg-red-950/40">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 text-xs font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-300"
        >
          Retry
        </button>
      </div>
    )
  }

  if (records.length === 0) {
    return <EmptyState onNavigateToIngest={onNavigateToIngest} />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Refresh row */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total documents"
          value={String(stats.total)}
          icon={Icons.docs}
        />
        <StatCard
          label="Classified"
          value={String(stats.classified)}
          sub={`${stats.total > 0 ? Math.round((stats.classified / stats.total) * 100) : 0}% of total`}
          icon={Icons.classified}
        />
        <StatCard
          label="Total amount"
          value={totalAmountDisplay}
          sub={stats.txWithAmount > 0 ? `across ${stats.txWithAmount} transaction${stats.txWithAmount !== 1 ? 's' : ''}` : 'no amounts extracted'}
          icon={Icons.amount}
        />
        <StatCard
          label="Unique merchants"
          value={String(stats.uniqueMerchants)}
          icon={Icons.merchants}
        />
      </div>

      {/* Category breakdown */}
      <CategoryBreakdown records={records} />

      {/* Transaction ledger */}
      <TransactionLedger transactions={records.flatMap((r) => r.transactions ?? [])} />
    </div>
  )
}
