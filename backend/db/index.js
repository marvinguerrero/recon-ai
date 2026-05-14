'use strict'

/**
 * db/index.js — Supabase PostgreSQL persistence layer.
 *
 * Replaces the flat-file JSON approach in the original uploadMeta.js.
 * Exports the same three functions (saveUploadRecord, listUploadRecords,
 * getUploadRecord) so server.js and uploadMeta.js need no changes.
 *
 * Tables:  documents  (one row per uploaded file)
 *          transactions (one or more rows per document)
 *
 * Duplicate counting uses the stored `normalized_key` column so the window
 * calculation is a single GROUP BY aggregation in JS rather than full-table
 * in-memory sort (matching original annotateDuplicates behaviour).
 */

const { getSupabaseClient } = require('../lib/supabase')
const { normalizeTransactionKey } = require('../deduplication/normalizeTransactionKey')

// ─── Shape helpers ──────────────────────────────────────────────────────────────

function rowToTransaction(tx, duplicateCount) {
  return {
    transactionId: tx.id,
    documentId: tx.document_id,
    sourceFile: tx.source_file,
    originalName: tx.original_name,
    category: tx.category,
    merchant: tx.merchant ?? null,
    amount: tx.amount ?? null,
    currency: tx.currency ?? null,
    transactionDate: tx.transaction_date ?? null,
    referenceNumber: tx.reference_number ?? null,
    confidenceScore: tx.confidence_score ?? 0,
    duplicateGroupId: tx.duplicate_group_id ?? null,
    rawOcrText: tx.raw_ocr_text ?? null,
    originalOcrAmount: tx.original_ocr_amount ?? null,
    amountConfidence: tx.amount_confidence ?? null,
    duplicateFlag: tx.duplicate_flag ?? false,
    duplicateCount: duplicateCount ?? 1,
  }
}

function rowToRecord(doc, transactions) {
  return {
    documentId: doc.id,
    storedName: doc.stored_name,
    originalName: doc.original_name,
    size: doc.size,
    ocrText: doc.ocr_text ?? null,
    savedAt: doc.saved_at,
    category: doc.category,
    confidence: doc.confidence,
    matchedKeywords: doc.matched_keywords ?? { primary: [], secondary: [], negative: [] },
    structuredData: doc.structured_data ?? null,
    storagePath: doc.storage_path ?? null,
    transactions,
    transactionCount: transactions.length,
  }
}

// ─── Duplicate counting ──────────────────────────────────────────────────────────

/**
 * Build a map of normalizedKey → count across the given transaction rows.
 * Mirrors the annotateDuplicates logic that ran over flat JSON files.
 */
function buildCountMap(txRows) {
  const map = new Map()
  for (const tx of txRows) {
    const key = tx.normalized_key
    if (key) map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Persist a document and its transactions to Supabase PostgreSQL.
 * Mirrors the original saveUploadRecord(record) signature exactly.
 */
async function saveUploadRecord({
  documentId,
  storedName,
  originalName,
  size,
  ocrText,
  category,
  confidence,
  matchedKeywords,
  structuredData,
  transactions,
  storagePath,
}) {
  const db = getSupabaseClient()

  const { error: docErr } = await db.from('documents').insert({
    id: documentId,
    stored_name: storedName,
    original_name: originalName,
    size,
    ocr_text: ocrText ?? null,
    category,
    confidence,
    matched_keywords: matchedKeywords ?? null,
    structured_data: structuredData ?? null,
    storage_path: storagePath ?? null,
  })

  if (docErr) throw new Error(`[db] saveUploadRecord (document): ${docErr.message}`)

  if (transactions && transactions.length > 0) {
    const rows = transactions.map((tx) => ({
      id: tx.transactionId,
      document_id: documentId,
      source_file: tx.sourceFile,
      original_name: tx.originalName,
      category: tx.category,
      merchant: tx.merchant ?? null,
      amount: tx.amount ?? null,
      currency: tx.currency ?? null,
      transaction_date: tx.transactionDate ?? null,
      reference_number: tx.referenceNumber ?? null,
      confidence_score: tx.confidenceScore ?? 0,
      duplicate_group_id: tx.duplicateGroupId ?? null,
      raw_ocr_text: tx.rawOcrText ?? null,
      original_ocr_amount: tx.originalOcrAmount ?? null,
      amount_confidence: tx.amountConfidence ?? null,
      duplicate_flag: tx.duplicateFlag ?? false,
      normalized_key: normalizeTransactionKey({
        merchant: tx.merchant,
        amount: tx.amount,
        transactionDate: tx.transactionDate,
        category: tx.category,
      }),
    }))

    const { error: txErr } = await db.from('transactions').insert(rows)
    if (txErr) throw new Error(`[db] saveUploadRecord (transactions): ${txErr.message}`)
  }
}

/**
 * Return all upload records newest-first, with global duplicate counts stamped
 * on every transaction row. Mirrors the original listUploadRecords() contract.
 */
async function listUploadRecords() {
  const db = getSupabaseClient()

  const [{ data: docs, error: docsErr }, { data: txns, error: txnsErr }] = await Promise.all([
    db.from('documents').select('*').order('saved_at', { ascending: false }),
    db.from('transactions').select('*'),
  ])

  if (docsErr) throw new Error(`[db] listUploadRecords (documents): ${docsErr.message}`)
  if (txnsErr) throw new Error(`[db] listUploadRecords (transactions): ${txnsErr.message}`)

  const countMap = buildCountMap(txns ?? [])

  // Group transactions by document_id for O(n) assembly.
  const txByDoc = new Map()
  for (const tx of (txns ?? [])) {
    const list = txByDoc.get(tx.document_id) ?? []
    list.push(rowToTransaction(tx, countMap.get(tx.normalized_key) ?? 1))
    txByDoc.set(tx.document_id, list)
  }

  return (docs ?? []).map((doc) => rowToRecord(doc, txByDoc.get(doc.id) ?? []))
}

/**
 * Return one record by its multer-generated stored filename.
 * Throws with code ENOENT when not found (matches original fs.readFile behaviour
 * so the existing 404 handler in server.js works unchanged).
 */
async function getUploadRecord(storedName) {
  const db = getSupabaseClient()

  const { data: doc, error } = await db
    .from('documents')
    .select('*')
    .eq('stored_name', storedName)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      const notFound = new Error(`No record for stored file: ${storedName}`)
      notFound.code = 'ENOENT'
      throw notFound
    }
    throw new Error(`[db] getUploadRecord: ${error.message}`)
  }

  // Load this document's transactions + global count map for accurate duplicateCount.
  const [{ data: myTxns, error: myErr }, { data: allTxns, error: allErr }] = await Promise.all([
    db.from('transactions').select('*').eq('document_id', doc.id),
    db.from('transactions').select('id, normalized_key'),
  ])

  if (myErr) throw new Error(`[db] getUploadRecord (transactions): ${myErr.message}`)
  if (allErr) throw new Error(`[db] getUploadRecord (all keys): ${allErr.message}`)

  const countMap = buildCountMap(allTxns ?? [])

  return rowToRecord(
    doc,
    (myTxns ?? []).map((tx) => rowToTransaction(tx, countMap.get(tx.normalized_key) ?? 1)),
  )
}

module.exports = { saveUploadRecord, listUploadRecords, getUploadRecord }
