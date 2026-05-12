/**
 * normalizeDate.js — extract and normalize a date from cleaned OCR text to ISO 8601 (YYYY-MM-DD).
 *
 * Supported input formats:
 *   YYYY-MM-DD   — already ISO, returned as-is
 *   MM/DD/YYYY   — most common in PH/US receipts
 *   MM/DD/YY     — 2-digit year expanded to 20xx
 *   DD Mon YYYY  — e.g. "12 May 2026" or "12-May-26"
 *   Mon DD, YYYY — e.g. "May 12, 2026"
 *
 * Strategy:
 *   1. Apply OCR digit corrections (O→0, I→1).
 *   2. Try each pattern against category keyword-adjacent lines first.
 *   3. Fall back to scanning the whole text for the first valid date.
 */

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** @param {string} str */
function fixDateOcr(str) {
  return str.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')
}

function pad(n) {
  return String(parseInt(n, 10)).padStart(2, '0')
}

function expandYear(yy) {
  return parseInt(yy, 10) < 100 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10)
}

// ─── Pattern registry ───────────────────────────────────────────────────────────
// Each entry: { re, fn } where fn receives the match array → ISO string or null.

const DATE_PATTERNS = [
  {
    // YYYY-MM-DD
    re: /\b(20\d{2})[/\-](0?[1-9]|1[0-2])[/\-](0?[1-9]|[12]\d|3[01])\b/,
    fn: (m) => `${m[1]}-${pad(m[2])}-${pad(m[3])}`,
  },
  {
    // MM/DD/YYYY or MM-DD-YYYY
    re: /\b(0?[1-9]|1[0-2])[/\-](0?[1-9]|[12]\d|3[01])[/\-](20\d{2})\b/,
    fn: (m) => `${m[3]}-${pad(m[1])}-${pad(m[2])}`,
  },
  {
    // MM/DD/YY or MM-DD-YY
    re: /\b(0?[1-9]|1[0-2])[/\-](0?[1-9]|[12]\d|3[01])[/\-](\d{2})\b/,
    fn: (m) => `${expandYear(m[3])}-${pad(m[1])}-${pad(m[2])}`,
  },
  {
    // DD Month YYYY or DD-Month-YY(YY)
    re: /\b(0?[1-9]|[12]\d|3[01])[\s\-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,\-]+(20\d{2}|\d{2})\b/i,
    fn: (m) => {
      const month = MONTH_MAP[m[2].toLowerCase().slice(0, 3)]
      if (!month) return null
      return `${expandYear(m[3])}-${pad(month)}-${pad(m[1])}`
    },
  },
  {
    // Month DD, YYYY or Month DD YYYY
    re: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+(0?[1-9]|[12]\d|3[01])[\s,]+(20\d{2}|\d{2})\b/i,
    fn: (m) => {
      const month = MONTH_MAP[m[1].toLowerCase().slice(0, 3)]
      if (!month) return null
      return `${expandYear(m[3])}-${pad(month)}-${pad(m[2])}`
    },
  },
]

// Priority date-indicator keywords per category.
const DATE_KEYWORDS = {
  receipt: ['date', 'receipt date', 'transaction date'],
  soa: ['statement date', 'billing date', 'billing period', 'date'],
  invoice: ['invoice date', 'date issued', 'date'],
  uncategorized: ['date'],
}

/** Try all patterns against a single line; return first ISO match or null. */
function matchDate(line) {
  const fixed = fixDateOcr(line)
  for (const { re, fn } of DATE_PATTERNS) {
    const m = fixed.match(re)
    if (m) {
      const iso = fn(m)
      if (iso) return iso
    }
  }
  return null
}

/**
 * @param {string} text — cleaned OCR text
 * @param {string} category
 * @returns {string | null} ISO date string (YYYY-MM-DD) or null
 */
function extractDate(text, category) {
  const lines = text.split('\n')
  const keywords = DATE_KEYWORDS[category] ?? DATE_KEYWORDS.uncategorized

  // Pass 1: scan lines that contain a date keyword.
  for (const kw of keywords) {
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].toLowerCase().includes(kw)) continue
      const iso = matchDate(lines[i])
      if (iso) return iso
      // Also try the next line (label then value pattern).
      if (i + 1 < lines.length) {
        const iso2 = matchDate(lines[i + 1])
        if (iso2) return iso2
      }
    }
  }

  // Pass 2: first date found anywhere in the document.
  for (const line of lines) {
    const iso = matchDate(line)
    if (iso) return iso
  }

  return null
}

module.exports = { extractDate }
