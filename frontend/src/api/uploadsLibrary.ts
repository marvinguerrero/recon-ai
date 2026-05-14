/**
 * Fetches persisted upload + OCR metadata from the Express API.
 * Data is stored in Supabase PostgreSQL (documents + transactions tables).
 */

import type { StructuredData, TransactionRow } from './upload'
import { apiUrl } from './client'

export type SavedUploadRecord = {
  documentId?: string
  storedName: string
  originalName: string
  size: number
  ocrText: string | null
  savedAt: string
  /** Classification label assigned by keyword scoring. */
  category: string
  /** Fraction of category keywords matched (0–1). May be absent on records saved before this field was added. */
  confidence: number
  /** Keywords that contributed to the classification result. Absent on records saved before this field was added. */
  matchedKeywords?: {
    primary: string[]
    secondary: string[]
    negative: string[]
  }
  /** Normalized financial fields. Absent on records saved before this field was added. */
  structuredData?: StructuredData
  /** Flat normalized transaction rows. Absent on records saved before this field was added. */
  transactions?: TransactionRow[]
  transactionCount?: number
  /**
   * Supabase Storage path for the original file (e.g. "doc_abc/filename.jpg").
   * Null for records saved before cloud storage was enabled.
   * Use GET /api/uploads/:storedName/url to obtain a signed URL for viewing.
   */
  storagePath?: string | null
}

/** GET /api/uploads — newest uploads first. */
export async function fetchUploadLibrary(): Promise<SavedUploadRecord[]> {
  const res = await fetch(apiUrl('/api/uploads'))
  const data: unknown = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Could not load uploads (${res.status}).`
    throw new Error(message)
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: unknown }).success === true &&
    'uploads' in data &&
    Array.isArray((data as { uploads: unknown }).uploads)
  ) {
    return (data as { uploads: SavedUploadRecord[] }).uploads
  }

  throw new Error('Unexpected response when loading uploads.')
}

/** GET /api/uploads/:storedName — one row (for detail pages or deep links). */
export async function fetchUploadByStoredName(
  storedName: string,
): Promise<SavedUploadRecord> {
  const enc = encodeURIComponent(storedName)
  const res = await fetch(apiUrl(`/api/uploads/${enc}`))
  const data: unknown = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Could not load file (${res.status}).`
    throw new Error(message)
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: unknown }).success === true &&
    'upload' in data &&
    typeof (data as { upload: unknown }).upload === 'object' &&
    (data as { upload: unknown }).upload !== null
  ) {
    return (data as { upload: SavedUploadRecord }).upload
  }

  throw new Error('Unexpected response when loading one upload.')
}
