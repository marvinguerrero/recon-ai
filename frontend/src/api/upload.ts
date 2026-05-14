/**
 * Upload multiple files to the Express API in one HTTP request.
 *
 * - Endpoint: POST `/api/upload`
 * - Body: `multipart/form-data` with repeated field name `files` (one part per file).
 * - Response: JSON with `filenames` (saved names on disk) and `files` (details per file).
 *
 * In dev, Vite proxies `/api` → `http://localhost:5000` (see `vite.config.ts`).
 * In production, set `VITE_API_BASE_URL` if the API lives on another origin.
 */

import { MAX_FILES_PER_UPLOAD } from '../components/upload/constants'
import { apiUrl } from './client'

/** One purchase/transaction entry extracted from a document (summary, inside structuredData). */
export type Transaction = {
  merchant: string
  amount: number
  currency: string | null
  rawOcrText: string | null
}

/** Normalized financial fields extracted from OCR text by the normalization pipeline. */
export type StructuredData = {
  merchant: string | null
  amount: number | null
  currency: string | null
  /** ISO 8601 date string (YYYY-MM-DD), or null if no date was found. */
  date: string | null
  referenceNumber: string | null
  /**
   * Transactions extracted from the document.
   * SOA: all purchases found in the screenshot (multi-row).
   * Receipt/invoice: the single purchase, or [] if merchant/amount missing.
   * Absent on older records.
   */
  transactions?: Transaction[]
}

/** A fully normalized, ledger-ready transaction row — one per purchase across all documents. */
export type TransactionRow = {
  transactionId: string
  documentId: string
  sourceFile: string
  originalName: string
  category: string
  merchant: string | null
  amount: number | null
  currency: string | null
  transactionDate: string | null
  referenceNumber: string | null
  confidenceScore: number
  duplicateGroupId: string | null
  rawOcrText: string | null
  /** How many transactions across all uploads share the same merchant/amount/date/category. 1 = unique. */
  duplicateCount: number
  /** Raw numeric value OCR produced before any decimal correction. null for non-SOA rows. */
  originalOcrAmount: number | null
  /** 0.0–1.0 confidence in the corrected amount value. null for non-SOA rows. */
  amountConfidence: number | null
  /** True when the same merchant+amount appeared more than once in the OCR scan (adjacent OCR duplicate). */
  duplicateFlag: boolean
}

/** One row from the server after a file is written under `backend/uploads/`. */
export type UploadedFileInfo = {
  documentId: string
  originalName: string
  storedName: string
  size: number
  /**
   * Text extracted by Tesseract OCR.
   * - `string`  — OCR ran; value is the extracted text (may be empty if no text was found).
   * - `null`    — file is not an image (PDF, text, etc.), so OCR was skipped.
   */
  ocrText: string | null
  /** Classification label assigned by keyword scoring (e.g. "receipt", "soa", "invoice", "uncategorized"). */
  category: string
  /** Fraction of category keywords matched (0–1). 0 means no match / uncategorized. */
  confidence: number
  /** Keywords that contributed to the classification result, grouped by signal type. */
  matchedKeywords: {
    primary: string[]
    secondary: string[]
    negative: string[]
  }
  /** Normalized financial fields extracted from OCR text. All fields are null when extraction fails. */
  structuredData: StructuredData
  /** Flat normalized transaction rows — one per purchase (SOA expands to multiple). */
  transactions: TransactionRow[]
  transactionCount: number
}

export type UploadApiSuccess = {
  success: true
  message: string
  /** Names as saved on the server (inside `uploads/`). Same order as your upload queue. */
  filenames: string[]
  files: UploadedFileInfo[]
}

export async function uploadFiles(
  files: File[],
): Promise<UploadApiSuccess> {
  if (files.length === 0) {
    throw new Error('Add at least one file before uploading.')
  }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error(
      `You can upload at most ${MAX_FILES_PER_UPLOAD} files in one request.`,
    )
  }

  // Multer expects every file under the same field name so it can collect an array.
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch(apiUrl('/api/upload'), {
    method: 'POST',
    body: formData,
  })

  const data: unknown = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Upload failed (${res.status}).`
    throw new Error(message)
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: unknown }).success === true &&
    'files' in data &&
    Array.isArray((data as { files: unknown }).files) &&
    'filenames' in data &&
    Array.isArray((data as { filenames: unknown }).filenames)
  ) {
    return data as UploadApiSuccess
  }

  throw new Error('Unexpected response from server.')
}
