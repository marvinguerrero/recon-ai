/**
 * extractReceiptTransaction.js — extract the single transaction from a receipt
 * or invoice using the already-normalized top-level fields.
 *
 * Receipts and invoices represent one purchase, so there is no multi-transaction
 * loop to run. This module simply wraps the extracted merchant + amount into the
 * shared Transaction shape for UI consistency.
 *
 * Returns [] when merchant or amount could not be determined (no usable transaction).
 */

/**
 * @param {string|null} merchant
 * @param {number|null} amount
 * @param {string|null} currency
 * @returns {Array<{merchant: string, amount: number, currency: string|null}>}
 */
function extractReceiptTransaction(merchant, amount, currency) {
  if (!merchant || amount === null) return []
  return [{ merchant, amount, currency }]
}

module.exports = { extractReceiptTransaction }
