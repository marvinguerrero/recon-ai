import type { SavedUploadRecord } from '../../api/uploadsLibrary'
import { DocumentCategoryBadge } from '../upload/DocumentCategoryBadge'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return null
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency ? `${currency} ${formatted}` : formatted
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Dash() {
  return <span className="text-zinc-300 dark:text-zinc-600">—</span>
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ row }: { row: SavedUploadRecord }) {
  const sd = row.structuredData
  const amount = formatAmount(sd?.amount, sd?.currency)
  const date = formatDate(sd?.date)
  const confidence = row.confidence > 0 ? `${Math.round(row.confidence * 100)}%` : null

  return (
    <tr className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
      {/* Document name + upload date */}
      <td className="px-5 py-3">
        <p
          className="max-w-[180px] truncate font-medium text-zinc-900 dark:text-zinc-100"
          title={row.originalName}
        >
          {row.originalName}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(row.savedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </td>

      {/* Category */}
      <td className="px-3 py-3">
        <DocumentCategoryBadge category={row.category} />
      </td>

      {/* Merchant — hidden on small screens */}
      <td className="hidden max-w-[160px] truncate px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400 sm:table-cell">
        {sd?.merchant ?? <Dash />}
      </td>

      {/* Amount */}
      <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {amount ?? <Dash />}
      </td>

      {/* Date — hidden on small screens */}
      <td className="hidden px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400 sm:table-cell">
        {date ?? <Dash />}
      </td>

      {/* Reference — hidden on medium and smaller screens */}
      <td className="hidden px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400 lg:table-cell">
        {sd?.referenceNumber ?? <Dash />}
      </td>

      {/* Confidence — hidden on medium and smaller screens */}
      <td className="hidden px-5 py-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400 md:table-cell">
        {confidence ?? <Dash />}
      </td>
    </tr>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TransactionsTable({ records }: { records: SavedUploadRecord[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">All documents</h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {records.length} document{records.length !== 1 ? 's' : ''} · newest first
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Document
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Category
              </th>
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 sm:table-cell">
                Merchant
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Amount
              </th>
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 sm:table-cell">
                Date
              </th>
              <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 lg:table-cell">
                Reference
              </th>
              <th className="hidden px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 md:table-cell">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {records.map((row) => (
              <Row key={row.storedName} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
