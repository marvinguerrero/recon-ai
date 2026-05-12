/**
 * normalizeAmount.js — extract and normalize a currency amount from cleaned OCR text.
 *
 * Strategy:
 *   1. Detect currency from the full text (₱/PHP → PHP, $/USD → USD).
 *   2. Walk category-specific amount keywords in priority order.
 *   3. For each matching line, extract the rightmost money-like token.
 *      If the line itself has no number, try the following line
 *      (label on one line, value on the next is common in receipts).
 *   4. Return the first valid { amount, currency } pair found.
 *
 * OCR corrections applied only in numeric context: O→0, l/I→1.
 * Thousands separators (1,234 or 1.234) are stripped before parsing.
 */

// ─── OCR corrections in numeric context ────────────────────────────────────────

/** @param {string} str */
function fixNumericOcr(str) {
  return str.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')
}

/** @param {string} str @returns {number | null} */
function parseFormattedNumber(str) {
  const s = fixNumericOcr(str.trim())
  const clean = s
    .replace(/(\d)[,\s](\d{3})(?=[,.\s]|$)/g, '$1$2') // strip thousands sep
    .replace(/,(?=\d{1,2}$)/, '.')                      // trailing comma → decimal
    .replace(/[^\d.]/g, '')                              // keep digits + dot only
  const n = parseFloat(clean)
  return isNaN(n) || n === 0 ? null : Math.round(n * 100) / 100
}

// ─── Currency detection ─────────────────────────────────────────────────────────

/** @param {string} text @returns {string | null} */
function detectCurrency(text) {
  if (/[₱]/.test(text) || /\bphp\b/i.test(text)) return 'PHP'
  if (/\busd\b|\$/.test(text)) return 'USD'
  return null
}

// ─── Amount extraction ──────────────────────────────────────────────────────────

// Matches an optional currency symbol followed by a digit-group (3+ chars or with decimals).
const MONEY_RE = /[₱$]?\s*(\d[\d,.\s]{1,}\d|\d{3,})/g

/** Extract the rightmost money-like value from a single line. */
function extractAmountFromLine(line) {
  const fixed = fixNumericOcr(line)
  const matches = [...fixed.matchAll(MONEY_RE)]
  if (matches.length === 0) return null
  // Rightmost value is usually the amount column in two-column layouts.
  return parseFormattedNumber(matches[matches.length - 1][1])
}

// Priority keyword lists per category.
// 'total' is stored as a RegExp to enforce word boundaries (prevents matching 'subtotal').
const AMOUNT_KEYWORDS = {
  receipt: [
    'grand total',
    'total amount',
    'total due',
    /\btotal\b/i,
    'amount due',
    'subtotal',
  ],
  soa: [
    'outstanding balance',
    'total balance',
    'minimum amount due',
    'amount due',
    /\btotal\b/i,
  ],
  invoice: [
    'balance due',
    'total amount due',
    'amount due',
    'grand total',
    /\btotal\b/i,
  ],
  uncategorized: [/\btotal\b/i, 'amount', 'balance'],
}

/**
 * @param {string} text — cleaned OCR text (may be multi-line)
 * @param {string} category
 * @returns {{ amount: number | null, currency: string | null }}
 */
function extractAmount(text, category) {
  const currency = detectCurrency(text)
  const lines = text.split('\n')
  const keywords = AMOUNT_KEYWORDS[category] ?? AMOUNT_KEYWORDS.uncategorized

  for (const kw of keywords) {
    const isRegex = kw instanceof RegExp
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase()
      const matched = isRegex ? kw.test(lineLower) : lineLower.includes(kw)
      if (!matched) continue

      const sameLine = extractAmountFromLine(lines[i])
      if (sameLine !== null) return { amount: sameLine, currency }

      if (i + 1 < lines.length) {
        const nextLine = extractAmountFromLine(lines[i + 1])
        if (nextLine !== null) return { amount: nextLine, currency }
      }
    }
  }

  return { amount: null, currency }
}

module.exports = { extractAmount, detectCurrency }
