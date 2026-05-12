/**
 * normalizeTransactionKey.js — produce a stable string key for a transaction
 * used to detect duplicates across uploads.
 *
 * Matching fields: category · merchant (normalized) · amount (2dp) · transactionDate
 *
 * Normalization applied to merchant:
 *   - lowercase
 *   - strip non-alphanumeric characters (punctuation, brackets, symbols)
 *   - collapse internal whitespace
 *
 * This means "GUARDIAN PHARMACY YAYA" and "Guardian Pharmacy Yaya" produce the
 * same key, as do amounts 1396.26 and 1396.260.
 */

/**
 * @param {{ merchant: string|null, amount: number|null, transactionDate: string|null, category: string }} tx
 * @returns {string}
 */
function normalizeTransactionKey({ merchant, amount, transactionDate, category }) {
  const m = (merchant ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const a = typeof amount === 'number' ? amount.toFixed(2) : ''
  const d = transactionDate ?? ''
  const c = category ?? ''

  return `${c}|${m}|${a}|${d}`
}

module.exports = { normalizeTransactionKey }
