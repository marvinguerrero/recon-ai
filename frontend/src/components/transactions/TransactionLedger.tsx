import { useState } from 'react'
import type { TransactionRow } from '../../api/upload'
import { DocumentCategoryBadge } from '../upload/DocumentCategoryBadge'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(amount: number | null, currency: string | null) {
  if (amount === null) return null
  const num = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${num}` : num
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortId(id: string) {
  return id.length > 14 ? id.slice(0, 14) : id
}

function Dash() {
  return <span className="text-zinc-300 dark:text-zinc-600">—</span>
}

function DuplicateBadge({ count }: { count: number }) {
  if (count <= 1) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        Unique
      </span>
    )
  }
  const color =
    count === 2
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${color}`}>
      ×{count}
    </span>
  )
}

// ─── Sort ──────────────────────────────────────────────────────────────────────

type SortKey = 'transactionId' | 'merchant' | 'amount' | 'category' | 'transactionDate' | 'confidenceScore' | 'duplicateCount'

function sortRows(rows: TransactionRow[], key: SortKey, dir: 'asc' | 'desc') {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Sort header cell ──────────────────────────────────────────────────────────

function SortTh({
  label,
  colKey,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  colKey: SortKey
  active: boolean
  dir: 'asc' | 'desc'
  onClick: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`cursor-pointer select-none px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onClick(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? 'text-violet-500' : 'text-zinc-300 dark:text-zinc-700'}`}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

// ─── Expanded row ──────────────────────────────────────────────────────────────

function AmountConfidencePip({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  const pct = Math.round(confidence * 100)
  const color =
    confidence >= 0.9
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      : confidence >= 0.6
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  return (
    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${color}`}>
      {pct}%
    </span>
  )
}

function ExpandedDetail({ row }: { row: TransactionRow }) {
  const amountWasCorrected =
    row.originalOcrAmount !== null &&
    row.amount !== null &&
    Math.abs(row.originalOcrAmount - row.amount) > 0.001

  return (
    <tr className="bg-zinc-50/80 dark:bg-zinc-800/30">
      <td colSpan={9} className="px-5 pb-4 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Raw OCR */}
          <div>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Raw OCR text
            </p>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {row.rawOcrText ?? '—'}
            </pre>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              <span className="font-semibold text-zinc-400 dark:text-zinc-500">Transaction ID</span>
              <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">{row.transactionId}</p>
            </div>
            <div>
              <span className="font-semibold text-zinc-400 dark:text-zinc-500">Source file</span>
              <p className="mt-0.5 break-all font-mono text-zinc-700 dark:text-zinc-300">{row.originalName}</p>
            </div>
            {row.referenceNumber && (
              <div>
                <span className="font-semibold text-zinc-400 dark:text-zinc-500">Reference</span>
                <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">{row.referenceNumber}</p>
              </div>
            )}

            {/* Amount validation */}
            {row.amountConfidence !== null && (
              <div>
                <span className="font-semibold text-zinc-400 dark:text-zinc-500">
                  Amount confidence
                  <AmountConfidencePip confidence={row.amountConfidence} />
                </span>
                {amountWasCorrected && (
                  <p className="mt-0.5 text-amber-600 dark:text-amber-400">
                    OCR read{' '}
                    <span className="font-mono font-semibold">{row.originalOcrAmount?.toFixed(2)}</span>
                    {' → corrected to '}
                    <span className="font-mono font-semibold">{row.amount?.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            {/* OCR duplicate flag */}
            {row.duplicateFlag && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-700/40 dark:bg-amber-900/20">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  OCR duplicate detected
                </p>
                <p className="mt-0.5 text-amber-600 dark:text-amber-500">
                  This merchant + amount appeared more than once in the scan. One entry was kept.
                </p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TransactionLedger({ transactions }: { transactions: TransactionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('transactionId')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortRows(transactions, sortKey, sortDir)

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/40">
      {/* Header */}
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Transaction ledger</h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · click a row to expand
        </p>
      </div>

      {transactions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
          No transactions yet — upload documents on the Ingest tab.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <SortTh label="Txn ID"       colKey="transactionId"   active={sortKey === 'transactionId'}   dir={sortDir} onClick={handleSort} />
                <SortTh label="Merchant"     colKey="merchant"        active={sortKey === 'merchant'}        dir={sortDir} onClick={handleSort} />
                <SortTh label="Amount"       colKey="amount"          active={sortKey === 'amount'}          dir={sortDir} onClick={handleSort} align="right" />
                <SortTh label="Category"     colKey="category"        active={sortKey === 'category'}        dir={sortDir} onClick={handleSort} />
                <SortTh label="Date"         colKey="transactionDate" active={sortKey === 'transactionDate'} dir={sortDir} onClick={handleSort} />
                <SortTh label="Confidence"   colKey="confidenceScore" active={sortKey === 'confidenceScore'} dir={sortDir} onClick={handleSort} align="right" />
                <SortTh label="Dupes"        colKey="duplicateCount"  active={sortKey === 'duplicateCount'}  dir={sortDir} onClick={handleSort} />
                {/* expand toggle column — no sort */}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sorted.map((row) => {
                const isOpen = expandedId === row.transactionId
                return (
                  <>
                    <tr
                      key={row.transactionId}
                      onClick={() => setExpandedId(isOpen ? null : row.transactionId)}
                      className={`cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 ${row.duplicateCount > 1 ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}
                    >
                      {/* Txn ID */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-violet-600 dark:text-violet-400">
                          {shortId(row.transactionId)}
                        </span>
                      </td>

                      {/* Merchant */}
                      <td className="px-3 py-3">
                        <p className="max-w-[180px] truncate text-sm font-medium text-zinc-900 dark:text-zinc-100" title={row.merchant ?? ''}>
                          {row.merchant ?? <Dash />}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                        {fmtAmount(row.amount, row.currency) ?? <Dash />}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <DocumentCategoryBadge category={row.category} />
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {fmtDate(row.transactionDate) ?? <Dash />}
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                        {row.confidenceScore > 0 ? `${Math.round(row.confidenceScore * 100)}%` : <Dash />}
                      </td>

                      {/* Duplicates */}
                      <td className="px-3 py-3">
                        <DuplicateBadge count={row.duplicateCount ?? 1} />
                      </td>

                      {/* Expand chevron */}
                      <td className="px-3 py-3 text-right">
                        <svg
                          className={`ml-auto h-4 w-4 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${isOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </td>
                    </tr>

                    {isOpen && <ExpandedDetail key={`${row.transactionId}-detail`} row={row} />}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
