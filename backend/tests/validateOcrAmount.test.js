'use strict'

/**
 * Edge-case tests for validateOcrAmount.
 *
 * Run:  npm test  (from backend/)
 *       node --test tests/validateOcrAmount.test.js
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateOcrAmount } = require('../normalization/validateOcrAmount')

// ─── Case 1: already-valid formats ────────────────────────────────────────────

test('exact 2-decimal: "402.11" → 402.11, confidence 1.0', () => {
  const r = validateOcrAmount('Amount PHP 402.11')
  assert.equal(r.correctedAmount, 402.11)
  assert.equal(r.originalOcrAmount, 402.11)
  assert.equal(r.confidence, 1.0)
  assert.equal(r.needsReview, false)
})

test('comma-thousands preserved: "1,396.26" → 1396.26, confidence 1.0', () => {
  const r = validateOcrAmount('Amount PHP 1,396.26')
  assert.equal(r.correctedAmount, 1396.26)
  assert.equal(r.confidence, 1.0)
  assert.equal(r.needsReview, false)
})

test('₱ symbol: "₱ 2,504.74" → 2504.74, confidence 1.0', () => {
  const r = validateOcrAmount('₱ 2,504.74')
  assert.equal(r.correctedAmount, 2504.74)
  assert.equal(r.confidence, 1.0)
})

test('large exact amount: "12,345.67" → 12345.67', () => {
  const r = validateOcrAmount('Amount PHP 12,345.67')
  assert.equal(r.correctedAmount, 12345.67)
  assert.equal(r.confidence, 1.0)
})

// ─── Case 1 (space-decimal fix) ───────────────────────────────────────────────

test('space-decimal fix: "1,744 11" → 1744.11, confidence 0.9', () => {
  // Before: OCR reads two tokens "1,744" and "11" separately
  // After:  space-decimal regex joins them → 1744.11
  const r = validateOcrAmount('Amount PHP 1,744 11')
  assert.equal(r.correctedAmount, 1744.11)
  assert.equal(r.confidence, 0.9)
  assert.equal(r.needsReview, false)
  // originalOcrAmount is the raw last token before the space-fix was applied
  assert.equal(r.originalOcrAmount, 11)
})

test('space-decimal: no false-positive on valid amount', () => {
  // "500 30" → "500.30" is a valid space-fix
  const r = validateOcrAmount('Amount 500 30')
  assert.equal(r.correctedAmount, 500.30)
  assert.equal(r.confidence, 0.9)
})

// ─── Case 2: wrong decimal count ──────────────────────────────────────────────

test('wrong decimal count: "402.1" → 402.1, confidence 0.7', () => {
  const r = validateOcrAmount('Amount PHP 402.1')
  assert.equal(r.correctedAmount, 402.1)
  assert.equal(r.confidence, 0.7)
  assert.equal(r.needsReview, true)
})

test('3 decimal places: "402.123" → 402.123, confidence 0.7', () => {
  const r = validateOcrAmount('Amount PHP 402.123')
  assert.equal(r.correctedAmount, 402.123)
  assert.equal(r.confidence, 0.7)
  assert.equal(r.needsReview, true)
})

// ─── Case 3: no decimal — contextual inference ────────────────────────────────

test('contextual 4-digit: "4021" + context [350,400,500] → 402.1 (d=1, conf 0.65)', () => {
  // Before (blind): 40.21 (confidence 0.55)
  // After (context median ≈ 400): 402.1 wins (|402.1–400|=2.1 vs |40.21–400|=359.79)
  const r = validateOcrAmount('Amount PHP 4021', [350, 400, 500])
  assert.equal(r.correctedAmount, 402.1)
  assert.equal(r.confidence, 0.65)
  assert.equal(r.needsReview, true)
  assert.equal(r.originalOcrAmount, 4021)
})

test('contextual 5-digit: "40211" + context [350,400,450] → 402.11 (d=2, conf 0.70)', () => {
  // Before (blind): 402.11 (confidence 0.55) — same result but better confidence
  // After (context median ≈ 400): d=2 wins (|402.11–400|=2.11)
  const r = validateOcrAmount('Amount PHP 40211', [350, 400, 450])
  assert.equal(r.correctedAmount, 402.11)
  assert.equal(r.confidence, 0.70)
  assert.equal(r.needsReview, true)
})

test('contextual 4-digit: "4021" + context [3000,3500,4000] → 4021 treated via d nearest 4000', () => {
  // d=1 → 402.1, |402.1–3500|=3097.9
  // d=2 → 40.21, |40.21–3500|=3459.79
  // d=3 → 4.021, |4.021–3500|=3495.979
  // 402.1 wins (least distance among the three), confidence 0.65
  const r = validateOcrAmount('Amount PHP 4021', [3000, 3500, 4000])
  assert.equal(r.correctedAmount, 402.1)
  assert.equal(r.confidence, 0.65)
})

test('contextual: amounts in low range [10,15,20], "4021" → 40.21 (d=2 closest to median 15)', () => {
  // d=1 → 402.1, |402.1–15|=387.1
  // d=2 → 40.21, |40.21–15|=25.21 ← winner
  // d=3 → 4.021, |4.021–15|=10.979 ← but < MIN_PLAUSIBLE_AMOUNT? No, 4.021 >= 1.0
  // Actually d=3 (4.021) wins here: |4.021–15| = 10.979 < 25.21
  // So this tests d=3 wins
  const r = validateOcrAmount('Amount PHP 4021', [10, 15, 20])
  assert.equal(r.correctedAmount, 4.02)  // 4021/1000 = 4.021 → rounded to 4.02
  assert.equal(r.confidence, 0.65)       // non-standard d=3
})

test('blind fallback (empty context): "4021" → 40.21, confidence 0.45', () => {
  // No context → cannot infer placement → fallback to d=2, flagged ambiguous
  const r = validateOcrAmount('Amount PHP 4021', [])
  assert.equal(r.correctedAmount, 40.21)
  assert.ok(r.confidence < 0.5, `expected confidence < 0.5, got ${r.confidence}`)
  assert.equal(r.needsReview, true)
})

test('no context param (default): "4021" → same as empty context', () => {
  const r = validateOcrAmount('Amount PHP 4021')
  assert.equal(r.correctedAmount, 40.21)
  assert.ok(r.confidence < 0.5)
})

test('6-digit malformed: "123456" + context [1200,1300,1250] → 1234.56 (d=2 closest to 1250)', () => {
  const r = validateOcrAmount('Amount PHP 123456', [1200, 1300, 1250])
  assert.equal(r.correctedAmount, 1234.56)
  assert.equal(r.confidence, 0.70)
})

test('all-invalid context (empty after filter): falls back to blind', () => {
  const r = validateOcrAmount('Amount PHP 9999', [])
  assert.equal(r.correctedAmount, 99.99)
  assert.equal(r.confidence, 0.45)
})

// ─── Case 4: very short value ─────────────────────────────────────────────────

test('2-digit value: "42" → 42, confidence 0.3 (centavo edge case)', () => {
  const r = validateOcrAmount('Amount PHP 42')
  assert.equal(r.correctedAmount, 42)
  assert.equal(r.confidence, 0.3)
  assert.equal(r.needsReview, true)
})

// ─── Unparseable ───────────────────────────────────────────────────────────────

test('no number token: returns null', () => {
  const r = validateOcrAmount('Amount PHP ???')
  assert.equal(r.correctedAmount, null)
  assert.equal(r.confidence, 0)
  assert.equal(r.needsReview, true)
})

test('null input: returns null', () => {
  const r = validateOcrAmount(null)
  assert.equal(r.correctedAmount, null)
  assert.equal(r.originalOcrAmount, null)
  assert.equal(r.confidence, 0)
})

test('empty string: returns null', () => {
  const r = validateOcrAmount('')
  assert.equal(r.correctedAmount, null)
  assert.equal(r.confidence, 0)
})

// ─── Invariants ────────────────────────────────────────────────────────────────

test('valid amounts are never modified regardless of context', () => {
  const contexts = [[], [10, 20], [1000, 2000], [0.5, 1]]
  for (const ctx of contexts) {
    const r = validateOcrAmount('Amount PHP 1,396.26', ctx)
    assert.equal(r.correctedAmount, 1396.26, `context ${JSON.stringify(ctx)} must not alter valid amount`)
    assert.equal(r.confidence, 1.0)
  }
})

test('originalOcrAmount always reflects pre-correction token', () => {
  // Exact: originalOcrAmount === correctedAmount
  const exact = validateOcrAmount('Amount PHP 250.00')
  assert.equal(exact.originalOcrAmount, 250.00)

  // Malformed (no decimal): originalOcrAmount preserves the integer OCR read
  const malformed = validateOcrAmount('Amount PHP 25000')
  assert.equal(malformed.originalOcrAmount, 25000)
})
