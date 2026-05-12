import { useState } from 'react'
import type { Transaction, StructuredData } from '../../api/upload'

// ─── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
      <dt className="w-28 shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="min-w-0 text-right">
        {value !== null ? (
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {value}
          </span>
        ) : (
          <span className="text-xs italic text-zinc-400 dark:text-zinc-600">—</span>
        )}
      </dd>
    </div>
  )
}

// ─── Transactions table ────────────────────────────────────────────────────────

function fmtAmount(amount: number, currency: string | null) {
  const num = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${num}` : num
}

function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false)
  if (transactions.length === 0) return null

  return (
    <div className="border-t border-zinc-200/80 dark:border-zinc-700/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Transactions
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {transactions.length}
          </span>
          <svg
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open ? 'rotate-180' : ''}`}
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
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-t border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Merchant
                </th>
                <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((tx, i) => (
                <tr key={i} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                  <td
                    className="max-w-[220px] truncate px-4 py-2 text-zinc-700 dark:text-zinc-300"
                    title={tx.merchant}
                  >
                    {tx.merchant}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                    {fmtAmount(tx.amount, tx.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function StructuredDataCard({
  structuredData,
}: {
  structuredData: StructuredData | undefined | null
}) {
  if (!structuredData) return null

  const { merchant, amount, currency, date, referenceNumber, transactions = [] } = structuredData

  const hasAnyField = [merchant, amount, currency, date, referenceNumber].some((v) => v !== null)

  const amountDisplay =
    amount !== null
      ? fmtAmount(amount, currency)
      : null

  const dateDisplay =
    date !== null
      ? (() => {
          const d = new Date(`${date}T00:00:00`)
          return isNaN(d.getTime())
            ? date
            : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        })()
      : null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/40 dark:border-zinc-700/80 dark:bg-zinc-900/30">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 px-4 py-2.5 dark:border-zinc-700/80">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.25 2.25 0 0 1 1 14.74l-.01-9.5Zm8.26 9.52v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.615c0 .414.336.75.75.75h5.373a.75.75 0 0 0 .627-.74Zm1.5 0a.75.75 0 0 0 .627.74h5.373a.75.75 0 0 0 .75-.75v-.615a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625Zm6.75-3.63v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75Zm-8.25 0v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75ZM17.5 7.5v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75Zm-8.25 0V6.875a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Structured data
        </span>
        {!hasAnyField && transactions.length === 0 && (
          <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600">Nothing extracted</span>
        )}
      </div>

      {/* Summary fields */}
      <dl className="px-4 py-1">
        <FieldRow label="Merchant" value={merchant} />
        <FieldRow label="Amount" value={amountDisplay} />
        {amountDisplay === null && <FieldRow label="Currency" value={currency} />}
        <FieldRow label="Date" value={dateDisplay} />
        <FieldRow label="Reference" value={referenceNumber} />
      </dl>

      {/* Transactions (SOA: all purchases; receipt: single purchase) */}
      <TransactionsTable transactions={transactions} />
    </div>
  )
}
