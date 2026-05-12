import { useState } from 'react'
import type { UploadedFileInfo } from '../../api/upload'
import { formatFileSize, getFileCategoryFromFilename } from './constants'
import { DocumentCategoryBadge } from './DocumentCategoryBadge'
import { ClassificationConfidence } from './ClassificationConfidence'
import { MatchedKeywordsDebug } from './MatchedKeywordsDebug'
import { StructuredDataCard } from './StructuredDataCard'
import type { FileCategory } from './types'

// ─── File-type badge ───────────────────────────────────────────────────────────

type DisplayKind = FileCategory | 'other'

const KIND_LABEL: Record<DisplayKind, string> = {
  pdf: 'PDF',
  image: 'Image',
  text: 'Text',
  other: 'Other',
}

const KIND_STYLES: Record<DisplayKind, string> = {
  pdf: 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/30',
  image:
    'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/30',
  text: 'bg-emerald-500/10 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
  other:
    'bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-400/25',
}

function FileTypeBadge({ filename }: { filename: string }) {
  const kind: DisplayKind = getFileCategoryFromFilename(filename) ?? 'other'
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${KIND_STYLES[kind]}`}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

// ─── Upload status badge ───────────────────────────────────────────────────────

function UploadStatusBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30">
      <svg
        className="h-3.5 w-3.5 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clipRule="evenodd"
        />
      </svg>
      Uploaded
    </span>
  )
}

// ─── OCR result panel ──────────────────────────────────────────────────────────

function OcrPanel({ ocrText }: { ocrText: string | null }) {
  const [expanded, setExpanded] = useState(() => ocrText !== null && ocrText.length > 0)

  if (ocrText === null) return null

  const hasText = ocrText.length > 0

  return (
    <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-700/80 dark:bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path
              fillRule="evenodd"
              d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              clipRule="evenodd"
            />
          </svg>
          OCR result
          {hasText && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              {ocrText.split(/\s+/).filter(Boolean).length} words
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80">
          {hasText ? (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {ocrText}
            </pre>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              No text found in this image.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main card ─────────────────────────────────────────────────────────────────

export function UploadedFileCard({ file }: { file: UploadedFileInfo }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900">
      <div className="p-4">
        {/* Filename row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="truncate font-medium text-zinc-900 dark:text-zinc-100"
              title={file.originalName}
            >
              {file.originalName}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-500"
              title={file.storedName}
            >
              {file.storedName}
            </p>
          </div>
          <FileTypeBadge filename={file.originalName} />
        </div>

        {/* Classification + status + size row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <DocumentCategoryBadge category={file.category} />
          <ClassificationConfidence confidence={file.confidence} />
          <span className="flex-1" />
          <UploadStatusBadge />
          <span className="tabular-nums text-sm text-zinc-600 dark:text-zinc-400">
            {formatFileSize(file.size)}
          </span>
        </div>

        <StructuredDataCard structuredData={file.structuredData} />
        <MatchedKeywordsDebug matchedKeywords={file.matchedKeywords} />
        <OcrPanel ocrText={file.ocrText} />
      </div>
    </div>
  )
}
