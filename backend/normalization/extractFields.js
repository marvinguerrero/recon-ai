/**
 * extractFields.js — orchestrate field extraction from cleaned OCR text.
 *
 * Exported shape (StructuredData):
 *   merchant       — inferred business name (first plausible header line)
 *   amount         — grand total as a number (e.g. 250.00)
 *   currency       — ISO 4217 code detected from text (e.g. "PHP")
 *   date           — ISO 8601 date string (e.g. "2026-05-12")
 *   referenceNumber — OR No / Invoice No / Account No detected from text
 *
 * All fields default to null when extraction fails.
 * Documents are never rejected — structuredData is always returned.
 */

const { cleanOcrText } = require('./cleanOcrText')
const { extractAmount } = require('./normalizeAmount')
const { extractDate } = require('./normalizeDate')
const { extractSoaTransactions } = require('./extractSoaTransactions')
const { extractReceiptTransaction } = require('./extractReceiptTransaction')

// ─── Null result shape ──────────────────────────────────────────────────────────

function emptyStructuredData() {
  return {
    merchant: null,
    amount: null,
    currency: null,
    date: null,
    referenceNumber: null,
    transactions: [],
  }
}

// ─── Merchant ───────────────────────────────────────────────────────────────────

// Patterns that disqualify a line from being a merchant name.
const NON_MERCHANT_RE = [
  /^\d/,                                                       // starts with a digit
  /[/@]/,                                                      // URL / email / date separator
  /\(\d/,                                                      // phone like (321)
  /\d{3,}/,                                                    // 3+ consecutive digits
  /\b(receipt|invoice|statement|template|email|address|dept|atin|attn|company\s+name)\b/i,
]

function isMerchantCandidate(line) {
  if (line.length < 4 || line.length > 70) return false
  if (NON_MERCHANT_RE.some((re) => re.test(line))) return false
  // Require at least two words so single-word noise is excluded.
  return line.split(/\s+/).filter(Boolean).length >= 2
}

function extractMerchant(lines) {
  for (const line of lines.slice(0, 10)) {
    if (isMerchantCandidate(line)) return line.trim()
  }
  return null
}

// ─── Reference number ───────────────────────────────────────────────────────────

const REF_PATTERNS = {
  receipt: [
    /\b(?:or|receipt|rcpt)\s*n[o0][.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
    /\bref(?:erence)?\s*n[o0][.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
  ],
  soa: [
    /\baccount\s*n(?:o|umber)[.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
    /\bref(?:erence)?\s*n[o0][.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
  ],
  invoice: [
    /\binvoice\s*n[o0][.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
    /\bp(?:urchase\s+)?o(?:rder)?\s*n[o0][.:\s#]*([A-Z0-9][A-Z0-9\-]{0,18})/i,
  ],
}

function extractReferenceNumber(text, category) {
  const patterns = REF_PATTERNS[category] ?? []
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

// ─── Main export ────────────────────────────────────────────────────────────────

/**
 * @param {string | null} ocrText
 * @param {string} category — classification result (used to prioritize field search)
 * @returns {{ merchant: string|null, amount: number|null, currency: string|null, date: string|null, referenceNumber: string|null }}
 */
function extractFields(ocrText, category) {
  if (!ocrText || ocrText.trim().length === 0) return emptyStructuredData()

  const cleaned = cleanOcrText(ocrText)
  const lines = cleaned.split('\n')

  const { amount, currency } = extractAmount(cleaned, category)
  const merchant = extractMerchant(lines)

  const transactions = category === 'soa'
    ? extractSoaTransactions(cleaned)
    : extractReceiptTransaction(merchant, amount, currency)

  return {
    merchant,
    amount,
    currency,
    date: extractDate(cleaned, category),
    referenceNumber: extractReferenceNumber(cleaned, category),
    transactions,
  }
}

module.exports = { extractFields }
