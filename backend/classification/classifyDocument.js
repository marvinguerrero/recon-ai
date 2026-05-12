/**
 * classifyDocument.js — run every keyword rule through the scoring engine and pick the winner.
 *
 * Algorithm:
 *   1. Score each rule's primary, secondary, and negative keywords against the OCR text.
 *   2. The rule with the highest rawScore wins.
 *   3. If the winning confidence is below MIN_CONFIDENCE, fall back to "uncategorized".
 *
 * Uploads are NEVER rejected — this is best-effort classification only.
 * Files and OCR results are always preserved regardless of outcome.
 */

const { RULES } = require('./keywordRules')
const { scoreRule } = require('./scoringEngine')
const { cleanOcrText } = require('../normalization/cleanOcrText')
const { extractSoaTransactions } = require('../normalization/extractSoaTransactions')

const MIN_CONFIDENCE = 0.1

/** @returns {{ category: string, confidence: number, matchedKeywords: { primary: string[], secondary: string[], negative: string[] } }} */
const FALLBACK = Object.freeze({
  category: 'uncategorized',
  confidence: 0,
  matchedKeywords: { primary: [], secondary: [], negative: [] },
})

/**
 * @param {string | null} ocrText
 * @returns {{ category: string, confidence: number, matchedKeywords: { primary: string[], secondary: string[], negative: string[] } }}
 */
function classifyDocument(ocrText) {
  if (!ocrText || ocrText.trim().length === 0) return FALLBACK

  // Multiple-merchant override: if the screenshot contains 2+ distinct purchases
  // (each with its own merchant + amount line), it is definitively an SOA.
  const cleaned = cleanOcrText(ocrText)
  if (extractSoaTransactions(cleaned).length >= 2) {
    return {
      category: 'soa',
      confidence: 1,
      matchedKeywords: { primary: ['multiple merchants detected'], secondary: [], negative: [] },
    }
  }

  const lower = ocrText.toLowerCase()

  let bestRawScore = -Infinity
  let winner = null

  for (const rule of RULES) {
    const result = scoreRule(lower, rule)
    if (result.rawScore > bestRawScore) {
      bestRawScore = result.rawScore
      winner = { category: rule.category, ...result }
    }
  }

  if (!winner || winner.confidence < MIN_CONFIDENCE) return FALLBACK

  return {
    category: winner.category,
    confidence: winner.confidence,
    matchedKeywords: winner.matchedKeywords,
  }
}

module.exports = { classifyDocument }
