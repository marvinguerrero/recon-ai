/**
 * keywordRules.js — weighted keyword rules per document category.
 *
 * Each rule has:
 *   category   — the label to assign when this rule wins
 *   primary    — high-signal keywords   (+2 each via scoringEngine)
 *   secondary  — supporting context     (+1 each)
 *   negative   — counter-evidence       (-2 each)
 *
 * To add a new category: add one entry to RULES. No other file needs to change.
 */

const RULES = [
  {
    category: 'receipt',
    primary: [
      'official receipt',
      'receipt no',
      'or no',
      'vat',
      'tin',
      'cashier',
      'subtotal',
      'qty',
      'change',
    ],
    secondary: [
      'thank you',
      'store',
      'branch',
      'discount',
      'total',
    ],
    negative: [
      'credit limit',
      'minimum amount due',
      'statement date',
    ],
  },
  {
    category: 'soa',
    primary: [
      'statement date',
      'outstanding balance',
      'minimum amount due',
      'credit limit',
      'account number',
      'transaction date',
      'posted date',
      'available credit',
    ],
    secondary: [
      'payment due date',
      'billing period',
      'previous balance',
      'finance charge',
    ],
    negative: [
      'qty',
      'cashier',
      'vat breakdown',
    ],
  },
  {
    category: 'invoice',
    primary: [
      'invoice no',
      'bill to',
      'invoice date',
      'due date',
      'unit price',
      'terms',
    ],
    secondary: [
      'supplier',
      'purchase order',
      'balance due',
    ],
    negative: [],
  },
]

module.exports = { RULES }
