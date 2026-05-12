import type { FileCategory } from './types'

/** Default cap per file (50 MB). Exposed for tests and product tuning. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

/** Max files per queue and per `POST /api/upload` (must match backend `upload.array`). */
export const MAX_FILES_PER_UPLOAD = 100

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'])
const TEXT_EXT = new Set(['.txt', '.md', '.csv', '.tsv', '.json', '.xml', '.log'])

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot === filename.length - 1) return ''
  return filename.slice(dot).toLowerCase()
}

/**
 * Infer PDF / image / text from a filename when you no longer have a browser `File`
 * (for example, rows returned from the upload API).
 */
export function getFileCategoryFromFilename(
  filename: string,
): FileCategory | null {
  const ext = getExtension(filename)
  if (ext === '.pdf') return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (TEXT_EXT.has(ext)) return 'text'
  return null
}

export function getFileCategory(file: File): FileCategory | null {
  const type = file.type.toLowerCase()
  const ext = getExtension(file.name)

  if (type === 'application/pdf' || ext === '.pdf') return 'pdf'

  if (type.startsWith('image/') || IMAGE_EXT.has(ext)) return 'image'

  if (
    type.startsWith('text/') ||
    type === 'application/json' ||
    type === 'application/xml' ||
    TEXT_EXT.has(ext)
  ) {
    return 'text'
  }

  return null
}

export function isAcceptedFile(file: File): boolean {
  return getFileCategory(file) !== null
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB'] as const
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  )
  const n = bytes / Math.pow(k, i)
  const rounded = i === 0 ? Math.round(n) : Math.round(n * 10) / 10
  return `${rounded} ${sizes[i]}`
}

/** `accept` string for the hidden file input. */
export const INPUT_ACCEPT =
  'application/pdf,image/*,text/plain,text/csv,text/markdown,.md,.txt,.json,.xml,.csv,.tsv'
