/**
 * validateOcrAmount.js — parse and validate a PHP currency amount from a raw OCR amount line.
 *
 * Philippine peso amounts follow the X,XXX.XX format (exactly 2 decimal places).
 *
 * Confidence scale:
 *   1.0        — exact 2-decimal OCR match, no correction applied
 *   0.80–0.95  — spacing or comma fix applied (e.g. "1,744 11" → 1744.11)
 *   0.50–0.75  — decimal inferred from context (no decimal in OCR token)
 *   < 0.50     — blind fallback or ambiguous (no context available)
 *
 * Before/after examples (Case 3 with context [350, 400, 500]):
 *   "Amount PHP 4021"  before → 40.21  (0.55, blind last-2)
 *                      after  → 402.1  (0.65, context median ≈ 400, d=1 wins)
 *
 *   "Amount PHP 40211" before → 402.11 (0.55, blind last-2)
 *                      after  → 402.11 (0.70, context median ≈ 400, d=2 wins, same result)
 *
 *   "Amount PHP 4021"  with no context:
 *                      before → 40.21  (0.55)
 *                      after  → 40.21  (0.45, flagged ambiguous)
 *
 * Returns:
 *   correctedAmount   — best numeric value after applying corrections
 *   originalOcrAmount — raw last-token value before any correction (audit trail)
 *   confidence        — 0.0–1.0 per scale above
 *   needsReview       — true when a correction was applied or format is non-standard
 */

function fixSpacedDecimal(str) {
  return str.replace(/([\d,]{3,})\s+(\d{2})(?=\s|$)/g, '$1.$2')
}

/** Extract the last number token from a line (no corrections applied). */
function lastRawToken(line) {
  const re = /[\d,]+(?:\.\d+)?/g
  let m
  let last = null
  while ((m = re.exec(line)) !== null) last = m[0]
  return last
}

/** Parse a number string (with optional commas) to float. */
function parseToken(tok) {
  if (!tok) return null
  const v = parseFloat(tok.replace(/,/g, ''))
  return isNaN(v) ? null : v
}

/**
 * Return true when value falls within the observed range of context amounts,
 * using a generous envelope (10× lower, 10× upper) to allow for outliers.
 * Always returns true when context is empty (no basis for rejection).
 *
 * @param {number} value
 * @param {number[]} amounts
 * @returns {boolean}
 */
function isWithinRange(value, amounts) {
  if (!amounts || amounts.length === 0) return true
  const lo = Math.min(...amounts) * 0.1
  const hi = Math.max(...amounts) * 10
  return value >= lo && value <= hi
}

/**
 * Use the median of nearby validated amounts to choose the most plausible decimal
 * placement for a digit string that has no decimal point.
 *
 * Tries placements d = 1, 2, 3 decimal places.
 * Picks the value closest to the context median, then validates it against the
 * observed range. A result outside [min*0.1, max*10] is flagged as ambiguous.
 * Falls back to blind last-2 (d=2) when context is empty or all placements yield < 1.00.
 *
 * Before/after with range validation, context [300, 400, 500]:
 *   "40211" → d=2 → 402.11, in range [30, 5000] → confidence 0.70  (unchanged)
 *   "9999999" → best d=3 → 9999.999, outside hi (5000) → confidence 0.45 (out of range)
 *
 * @param {string} digits — digit string with commas already removed, length > 2
 * @param {number[]} contextAmounts — validated amounts from other lines in the same document
 * @returns {{ value: number, confidence: number }}
 */
function inferDecimalPlacement(digits, contextAmounts) {
  const n = parseInt(digits, 10)
  const len = digits.length

  if (!contextAmounts || contextAmounts.length === 0) {
    return { value: Math.round((n / 100) * 100) / 100, confidence: 0.45 }
  }

  const sorted = [...contextAmounts].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  const candidates = []
  for (let d = 1; d <= Math.min(len - 1, 3); d++) {
    const value = Math.round((n / Math.pow(10, d)) * 100) / 100
    if (value >= 1.0) {
      candidates.push({ value, d, distance: Math.abs(value - median) })
    }
  }

  if (candidates.length === 0) {
    return { value: Math.round((n / 100) * 100) / 100, confidence: 0.45 }
  }

  candidates.sort((a, b) => a.distance - b.distance)
  const best = candidates[0]

  // Validate against the observed range. Out-of-range results are ambiguous even
  // if they were the closest candidate to the median.
  if (!isWithinRange(best.value, contextAmounts)) {
    return { value: best.value, confidence: 0.45 }
  }

  // Standard 2-decimal wins slightly higher confidence than non-standard placements.
  return {
    value: best.value,
    confidence: best.d === 2 ? 0.70 : 0.65,
  }
}

/**
 * @param {string} rawAmountLine — the full amount line as OCR emitted it, e.g. "Amount PHP 4021"
 * @param {number[]} [contextAmounts] — amounts already validated at confidence ≥ 0.7 from
 *   other lines in the same document; used to infer decimal placement for malformed tokens.
 * @returns {{ correctedAmount: number|null, originalOcrAmount: number|null, confidence: number, needsReview: boolean }}
 */
function validateOcrAmount(rawAmountLine, contextAmounts = []) {
  if (!rawAmountLine) {
    return { correctedAmount: null, originalOcrAmount: null, confidence: 0, needsReview: true }
  }

  // Step 1 — capture raw (pre-fix) last token and its numeric value
  const rawTok = lastRawToken(rawAmountLine)
  const originalOcrAmount = parseToken(rawTok)

  // Step 2 — apply space-decimal fix and re-extract
  const spacedFixed = fixSpacedDecimal(rawAmountLine)
  const spacedFixApplied = spacedFixed !== rawAmountLine
  const fixedTok = lastRawToken(spacedFixed)
  const fixedValue = parseToken(fixedTok)

  if (fixedTok === null || fixedValue === null) {
    return { correctedAmount: null, originalOcrAmount, confidence: 0, needsReview: true }
  }

  // Case 1: perfect 2-decimal format after optional space fix
  // Before: "Amount PHP 1,744 11"  → after space-fix: 1744.11  (confidence 0.90)
  // Before: "Amount PHP 1,396.26"  → unchanged: 1396.26       (confidence 1.00)
  if (/[\d,]+\.\d{2}$/.test(fixedTok)) {
    return {
      correctedAmount: fixedValue,
      originalOcrAmount: spacedFixApplied ? originalOcrAmount : fixedValue,
      confidence: spacedFixApplied ? 0.9 : 1.0,
      needsReview: false,
    }
  }

  // Case 2: decimal present but non-standard decimal count (e.g. "402.1", "402.123")
  // Kept as-is; the value is plausible but format is off.
  if (fixedTok.includes('.')) {
    return {
      correctedAmount: fixedValue,
      originalOcrAmount,
      confidence: 0.7,
      needsReview: true,
    }
  }

  // Case 3: no decimal at all — use contextual inference; never blindly use last-2.
  // Before: "Amount PHP 4021" + context [350–500] → 40.21  (blind, 0.55)
  // After:  "Amount PHP 4021" + context [350–500] → 402.1  (contextual, 0.65)
  const digits = fixedTok.replace(/,/g, '')
  if (digits.length > 2) {
    const { value: corrected, confidence } = inferDecimalPlacement(digits, contextAmounts)
    return {
      correctedAmount: corrected,
      originalOcrAmount,
      confidence,
      needsReview: true,
    }
  }

  // Case 4: ≤ 2 digits — treat as a round centavo value; very unlikely in practice.
  return {
    correctedAmount: fixedValue,
    originalOcrAmount,
    confidence: 0.3,
    needsReview: true,
  }
}

module.exports = { validateOcrAmount }
