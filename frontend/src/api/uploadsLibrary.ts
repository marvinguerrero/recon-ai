/**
 * Fetches persisted upload + OCR metadata from the Express API.
 *
 * Data is written under `backend/uploads/.meta/` when files are uploaded
 * (see `uploadMeta.js` on the server).
 */

export type SavedUploadRecord = {
  storedName: string
  originalName: string
  size: number
  ocrText: string | null
  savedAt: string
}

function apiOrigin(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (typeof base === 'string' && base.length > 0) {
    return base.replace(/\/$/, '')
  }
  return ''
}

/** GET /api/uploads — newest uploads first. */
export async function fetchUploadLibrary(): Promise<SavedUploadRecord[]> {
  const prefix = apiOrigin()
  const url = prefix ? `${prefix}/api/uploads` : '/api/uploads'
  const res = await fetch(url)
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
  const prefix = apiOrigin()
  const url = prefix ? `${prefix}/api/uploads/${enc}` : `/api/uploads/${enc}`
  const res = await fetch(url)
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
