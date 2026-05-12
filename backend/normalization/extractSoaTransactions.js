/**
 * extractSoaTransactions.js — extract individual purchase transactions from a
 * Statement of Account (SOA) screenshot.
 *
 * SOA documents often contain multiple merchants each followed by their amount.
 * Bank app screenshots also capture UI chrome that OCR picks up as text:
 *
 *   GUARDIAN PHARMACY YAYA BSB BN Ad   ← "BSB BN" = branch label, "Ad" = chevron icon
 *   Amount PHP 1,396.26
 *   ENTREK (B) SDN BHD BSB BN Vv       ← "Vv" = dropdown arrow artifact
 *   Amount PHP 2,504.74
 *
 * cleanMerchantName() strips these trailing UI artifacts before storing.
 *
 * Detection rule:
 *   - Pre-scan all lines to find date headers (extractSoaDates).
 *   - Pre-scan amount lines to collect a context set for decimal inference.
 *   - Scan every line that starts with "Amount" or "Amt".
 *   - The nearest non-empty, non-amount line above it is the merchant.
 *   - The active date at the merchant's line index is inherited from the nearest
 *     preceding date header (applyDateContext).
 *
 * Duplicate handling:
 *   - Both rows are preserved (no automatic collapse).
 *   - duplicateFlag   — true for every occurrence after the first.
 *   - duplicateGroupId — deterministic 8-hex-char ID shared by all rows with the
 *     same (merchant, amount) key.
 *   - duplicateCount  — how many rows share this groupId in the current document.
 *
 * Returns [] when fewer than 2 rows are found (single-purchase case is covered
 * by the top-level merchant/amount fields).
 */

const { createHash } = require('crypto')
const { extractSoaDates } = require('./extractSoaDates')
const { applyDateContext } = require('./applyDateContext')
const { validateOcrAmount } = require('./validateOcrAmount')

const AMOUNT_LABEL_RE = /^\s*(?:amount|amt)[:\s]*/i
const CURRENCY_RE = /\b(PHP|USD|EUR|GBP|SGD|MYR|AUD|JPY|CNY|HKD|BND)\b|([₱$€£])/
const SYMBOL_MAP = { '₱': 'PHP', '$': 'USD', '€': 'EUR', '£': 'GBP' }

/**
 * Stable 8-char group identifier derived from the dedup key.
 * Same (merchant, amount) pair → same groupId, across calls.
 */
function makeGroupId(key) {
  return createHash('sha1').update(key).digest('hex').slice(0, 8)
}

/**
 * Strip UI chrome artifacts that OCR picks up from bank app screenshots:
 *   - "BSB BN" — branch sort-code label shown beside every merchant row
 *   - Trailing 1-2 char uppercase/mixed-case tokens — chevron/icon OCR noise (V, Vv, Ad…)
 */
function cleanMerchantName(raw) {
  return raw
    .replace(/\s+BSB\s+BN\b.*/i, '')
    .replace(/\s+[A-Za-z]{1,2}$/, '')
    .trim()
}

/**
 * @param {string} cleanedText — output of cleanOcrText()
 * @returns {Array<{
 *   merchant: string,
 *   amount: number,
 *   originalOcrAmount: number|null,
 *   amountConfidence: number,
 *   duplicateFlag: boolean,
 *   duplicateGroupId: string,
 *   duplicateCount: number,
 *   currency: string|null,
 *   transactionDate: string|null,
 *   rawOcrText: string
 * }>}
 */
function extractSoaTransactions(cleanedText) {
  const lines = cleanedText.split('\n')
  const dateAnchors = extractSoaDates(lines)

  // Pre-pass: collect high-confidence amounts (≥ 0.7) to guide decimal inference
  // for malformed tokens in the main pass. This avoids blindly inserting last-2 as cents.
  const contextAmounts = []
  for (let i = 0; i < lines.length; i++) {
    if (!AMOUNT_LABEL_RE.test(lines[i])) continue
    const { correctedAmount, confidence } = validateOcrAmount(lines[i], [])
    if (correctedAmount !== null && correctedAmount > 0 && confidence >= 0.7) {
      contextAmounts.push(correctedAmount)
    }
  }

  // Main pass: extract all transactions, including duplicates (both rows preserved).
  const firstSeenSet = new Set() // tracks which keys have been pushed at least once
  const transactions = []

  for (let i = 0; i < lines.length; i++) {
    if (!AMOUNT_LABEL_RE.test(lines[i])) continue

    const { correctedAmount, originalOcrAmount, confidence: amountConfidence } =
      validateOcrAmount(lines[i], contextAmounts)
    if (correctedAmount === null) continue

    const cm = lines[i].match(CURRENCY_RE)
    const currency = cm ? (cm[1] ?? SYMBOL_MAP[cm[2]] ?? null) : null

    // Walk back to find the merchant line — nearest non-empty, non-amount line above.
    let merchant = ''
    let merchantLineIdx = -1
    for (let j = i - 1; j >= 0; j--) {
      const candidate = lines[j].trim()
      if (!candidate) continue
      if (AMOUNT_LABEL_RE.test(candidate)) break
      merchant = candidate
      merchantLineIdx = j
      break
    }

    if (!merchant) continue

    const cleanedMerchant = cleanMerchantName(merchant)
    if (!cleanedMerchant) continue

    const transactionDate = applyDateContext(dateAnchors, merchantLineIdx)

    const key = `${cleanedMerchant}|${correctedAmount}`
    const duplicateGroupId = makeGroupId(key)

    // duplicateFlag is true for every occurrence after the first.
    const duplicateFlag = firstSeenSet.has(key)
    firstSeenSet.add(key)

    transactions.push({
      merchant: cleanedMerchant,
      amount: correctedAmount,
      originalOcrAmount,
      amountConfidence,
      duplicateFlag,
      duplicateGroupId,
      currency,
      transactionDate,
      rawOcrText: `${merchant}\n${lines[i].trim()}`,
    })
  }

  if (transactions.length < 2) return []

  // Compute per-group counts and annotate each row.
  const groupCounts = new Map()
  for (const tx of transactions) {
    groupCounts.set(tx.duplicateGroupId, (groupCounts.get(tx.duplicateGroupId) ?? 0) + 1)
  }

  return transactions.map((tx) => ({
    ...tx,
    duplicateCount: groupCounts.get(tx.duplicateGroupId) ?? 1,
  }))
}

module.exports = { extractSoaTransactions }
