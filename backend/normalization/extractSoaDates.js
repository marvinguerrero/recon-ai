/**
 * extractSoaDates.js — scan OCR lines for standalone date headers and return
 * them as positional anchors.
 *
 * A "date header" is a line whose entire content is a recognisable date and
 * nothing else. This distinguishes "May 01" (header) from "GUARDIAN PHARMACY
 * May 01" (merchant line with noise).
 *
 * Returns an array of { lineIdx, date } sorted ascending by lineIdx so that
 * applyDateContext can walk it in order.
 */

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

const MONTH_RE_SRC = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'

// Each entry: { re, toIso(match) → 'YYYY-MM-DD' }
const DATE_FORMATS = [
  // YYYY-MM-DD
  {
    re: /^(\d{4})-(\d{2})-(\d{2})$/,
    toIso: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  // MM/DD/YYYY or M/D/YYYY
  {
    re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    toIso: (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`,
  },
  // "May 01", "January 5"  — infer year from current date
  {
    re: new RegExp(`^(${MONTH_RE_SRC})\\s+(\\d{1,2})$`, 'i'),
    toIso: (m) => {
      const month = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]
      const day = m[2].padStart(2, '0')
      return `${new Date().getFullYear()}-${month}-${day}`
    },
  },
  // "May 01, 2026" or "May 1 2026"
  {
    re: new RegExp(`^(${MONTH_RE_SRC})\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i'),
    toIso: (m) => {
      const month = MONTH_MAP[m[1].slice(0, 3).toLowerCase()]
      const day = m[2].padStart(2, '0')
      return `${m[3]}-${month}-${day}`
    },
  },
  // "01 May 2026" (DD Month YYYY)
  {
    re: new RegExp(`^(\\d{1,2})\\s+(${MONTH_RE_SRC})\\s+(\\d{4})$`, 'i'),
    toIso: (m) => {
      const month = MONTH_MAP[m[2].slice(0, 3).toLowerCase()]
      const day = m[1].padStart(2, '0')
      return `${m[3]}-${month}-${day}`
    },
  },
]

/**
 * @param {string[]} lines — split OCR lines (already cleaned)
 * @returns {Array<{ lineIdx: number, date: string }>} sorted by lineIdx ascending
 */
function extractSoaDates(lines) {
  const anchors = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue

    for (const { re, toIso } of DATE_FORMATS) {
      const m = trimmed.match(re)
      if (m) {
        anchors.push({ lineIdx: i, date: toIso(m) })
        break
      }
    }
  }

  return anchors
}

module.exports = { extractSoaDates }
