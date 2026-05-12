/**
 * detectDuplicateTransactions.js — compute duplicateCount for every transaction
 * in a flat list by counting how many other transactions share the same key.
 *
 * duplicateCount is informational only — no records are removed or merged.
 * duplicateCount = 1 means the transaction appears exactly once (unique).
 * duplicateCount = 3 means two other transactions share the same key.
 */

const { normalizeTransactionKey } = require('./normalizeTransactionKey')

/**
 * @param {Array<object>} transactions — flat list of all TransactionRows across all documents
 * @returns {Map<string, number>} key → occurrence count
 */
function buildCountMap(transactions) {
  const map = new Map()
  for (const tx of transactions) {
    const key = normalizeTransactionKey(tx)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/**
 * Annotate each transaction with its duplicateCount.
 *
 * @param {Array<object>} transactions
 * @returns {Array<object>} same transactions with duplicateCount added
 */
function annotateDuplicates(transactions) {
  const countMap = buildCountMap(transactions)
  return transactions.map((tx) => ({
    ...tx,
    duplicateCount: countMap.get(normalizeTransactionKey(tx)) ?? 1,
  }))
}

module.exports = { annotateDuplicates, buildCountMap }
