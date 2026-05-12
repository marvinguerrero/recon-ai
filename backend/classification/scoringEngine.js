/**
 * scoringEngine.js — weighted keyword scoring for a single classification rule.
 *
 * Weights:
 *   Primary keyword match   +2
 *   Secondary keyword match +1
 *   Negative keyword match  -2
 *
 * Confidence = max(0, rawScore) / maxPossibleScore
 *   where maxPossibleScore = primary.length * 2 + secondary.length * 1
 *
 * Matching strategy:
 *   Multi-word phrases  — plain substring (they're already specific enough).
 *   Single words        — word-boundary regex to prevent partial hits
 *                         (e.g. "tin" must not match inside "hamilton").
 */

const PRIMARY_WEIGHT = 2
const SECONDARY_WEIGHT = 1
const NEGATIVE_WEIGHT = 2

/**
 * @param {string} text     — already-lowercased OCR text
 * @param {string} keyword  — already-lowercased keyword
 * @returns {boolean}
 */
function matchesKeyword(text, keyword) {
  if (keyword.includes(' ')) {
    return text.includes(keyword)
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`).test(text)
}

/**
 * Score OCR text against one keyword rule.
 *
 * @param {string} lower — lowercased OCR text
 * @param {{ primary: string[], secondary: string[], negative: string[] }} rule
 * @returns {{
 *   rawScore: number,
 *   confidence: number,
 *   matchedKeywords: { primary: string[], secondary: string[], negative: string[] }
 * }}
 */
function scoreRule(lower, rule) {
  const matchedPrimary = rule.primary.filter((kw) => matchesKeyword(lower, kw))
  const matchedSecondary = rule.secondary.filter((kw) => matchesKeyword(lower, kw))
  const matchedNegative = rule.negative.filter((kw) => matchesKeyword(lower, kw))

  const rawScore =
    matchedPrimary.length * PRIMARY_WEIGHT +
    matchedSecondary.length * SECONDARY_WEIGHT -
    matchedNegative.length * NEGATIVE_WEIGHT

  const maxPossibleScore =
    rule.primary.length * PRIMARY_WEIGHT + rule.secondary.length * SECONDARY_WEIGHT

  const confidence =
    maxPossibleScore > 0 ? Math.max(0, rawScore) / maxPossibleScore : 0

  return {
    rawScore,
    confidence,
    matchedKeywords: {
      primary: matchedPrimary,
      secondary: matchedSecondary,
      negative: matchedNegative,
    },
  }
}

module.exports = { scoreRule }
