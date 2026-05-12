/**
 * buildTransactionRows.js — normalize a processed document into a flat array of
 * transaction rows, one row per purchase.
 *
 * SOA documents expand into N rows (one per merchant+amount pair).
 * Receipt / invoice / uncategorized documents produce a single row.
 *
 * Each row carries all the context needed for a ledger view without requiring
 * the caller to join back to the source document.
 */

const { generateTransactionId } = require('./generateIds')

/**
 * @param {{
 *   documentId: string
 *   sourceFile: string
 *   originalName: string
 *   category: string
 *   confidence: number
 *   ocrText: string | null
 *   structuredData: import('./extractFields').StructuredData
 * }} doc
 * @returns {Array<import('../types').TransactionRow>}
 */
function buildTransactionRows({ documentId, sourceFile, originalName, category, confidence, ocrText, structuredData }) {
  const base = {
    documentId,
    sourceFile,
    originalName,
    category,
    confidenceScore: confidence,
    duplicateGroupId: null,
  }

  // SOA: one row per extracted transaction
  if (category === 'soa' && structuredData.transactions?.length > 0) {
    return structuredData.transactions.map((tx) => ({
      transactionId: generateTransactionId(),
      ...base,
      merchant: tx.merchant,
      amount: tx.amount,
      currency: tx.currency ?? structuredData.currency ?? null,
      transactionDate: tx.transactionDate ?? structuredData.date ?? null,
      referenceNumber: structuredData.referenceNumber ?? null,
      rawOcrText: tx.rawOcrText ?? null,
      originalOcrAmount: tx.originalOcrAmount ?? null,
      amountConfidence: tx.amountConfidence ?? null,
      duplicateFlag: tx.duplicateFlag ?? false,
    }))
  }

  // Single-transaction documents
  return [{
    transactionId: generateTransactionId(),
    ...base,
    merchant: structuredData.merchant ?? null,
    amount: structuredData.amount ?? null,
    currency: structuredData.currency ?? null,
    transactionDate: structuredData.date ?? null,
    referenceNumber: structuredData.referenceNumber ?? null,
    rawOcrText: ocrText ?? null,
    originalOcrAmount: null,
    amountConfidence: null,
    duplicateFlag: false,
  }]
}

module.exports = { buildTransactionRows }
