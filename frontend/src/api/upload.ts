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

/** One row from the server after a file is written under `backend/uploads/`. */
export type UploadedFileInfo = {
  originalName: string
  storedName: string
  size: number
  /**
   * Text extracted by Tesseract OCR.
   * - `string`  — OCR ran; value is the extracted text (may be empty if no text was found).
   * - `null`    — file is not an image (PDF, text, etc.), so OCR was skipped.
   */
  ocrText: string | null
}

export type UploadApiSuccess = {
  success: true
  message: string
  /** Names as saved on the server (inside `uploads/`). Same order as your upload queue. */
  filenames: string[]
  files: UploadedFileInfo[]
}

function uploadUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (typeof base === 'string' && base.length > 0) {
    return `${base.replace(/\/$/, '')}/api/upload`
  }
  return '/api/upload'
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

  const res = await fetch(uploadUrl(), {
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
