/**
 * cleanOcrText.js — light structural cleaning of raw OCR output.
 *
 * Only normalizes whitespace, drops blank / single-character lines, and applies
 * a small lookup of known OCR word errors (truncations and doublings).
 * Heavy digit corrections (O→0, I→1) are applied inside the field
 * extractors where numeric context is known, not here.
 *
 * Word-correction before/after examples:
 *   "RESTAURAN ILOILO"      → "RESTAURANT ILOILO"   (trailing T dropped by OCR)
 *   "FLICKKET CAFE"         → "FLICKET CAFE"         (doubled K)
 */

/**
 * Known OCR word errors: all-caps key → corrected all-caps value.
 * Only corrects whole words (word-boundary matched). Avoid adding entries that
 * could be real words or common abbreviations.
 *
 * @type {Map<string, string>}
 */
const OCR_WORD_CORRECTIONS = new Map([
  ['restauran', 'RESTAURANT'],
  ['flickket', 'FLICKET'],
])

/**
 * Apply known OCR word corrections to a single line.
 * Targets words of 5+ characters to avoid over-correcting short tokens.
 * Preserves all-caps if the input word is all-caps.
 *
 * @param {string} line
 * @returns {string}
 */
function applyWordCorrections(line) {
  return line.replace(/\b[A-Za-z]{5,}\b/g, (word) => {
    const correction = OCR_WORD_CORRECTIONS.get(word.toLowerCase())
    if (!correction) return word
    return word === word.toUpperCase()
      ? correction
      : correction.charAt(0) + correction.slice(1).toLowerCase()
  })
}

/**
 * @param {string | null} raw
 * @returns {string}
 */
function cleanOcrText(raw) {
  if (!raw) return ''
  return raw
    .split('\n')
    .map((line) => applyWordCorrections(line.replace(/\s+/g, ' ').trim()))
    .filter((line) => line.length > 1)
    .join('\n')
}

module.exports = { cleanOcrText }
