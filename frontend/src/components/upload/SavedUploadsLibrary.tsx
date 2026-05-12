import { formatFileSize } from './constants'
import type { SavedUploadRecord } from '../../api/uploadsLibrary'
import { DocumentCategoryBadge } from './DocumentCategoryBadge'
import { ClassificationConfidence } from './ClassificationConfidence'
import { MatchedKeywordsDebug } from './MatchedKeywordsDebug'
import { StructuredDataCard } from './StructuredDataCard'

export type SavedUploadsLibraryProps = {
  records: SavedUploadRecord[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function SavedUploadsLibrary({
  records,
  loading,
  error,
  onRefresh,
}: SavedUploadsLibraryProps) {
  return (
    <section
      className="mt-10 rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/40"
      aria-labelledby="library-heading"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <h2
            id="library-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Saved uploads &amp; OCR
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Loaded from the server (
            <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.75rem] dark:bg-zinc-800">
              GET /api/uploads
            </code>
            ). Each row is a JSON file under{' '}
            <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.75rem] dark:bg-zinc-800">
              backend/uploads/.meta/
            </code>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p
          className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && records.length === 0 && !error && (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">Loading…</p>
      )}

      {!loading && records.length === 0 && !error && (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">
          No saved uploads yet. Upload a file above — metadata and OCR text are stored on the
          server automatically.
        </p>
      )}

      {records.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {records.map((row) => (
            <li key={row.storedName} className="px-5 py-4">
              {/* Name + timestamp */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {row.originalName}
                </p>
                <time
                  className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
                  dateTime={row.savedAt}
                >
                  {new Date(row.savedAt).toLocaleString()}
                </time>
              </div>

              {/* Stored name + size + classification */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
                  {row.storedName} · {formatFileSize(row.size)}
                </p>
                <DocumentCategoryBadge category={row.category ?? 'uncategorized'} />
                <ClassificationConfidence confidence={row.confidence} />
              </div>

              <StructuredDataCard structuredData={row.structuredData} />
              <MatchedKeywordsDebug matchedKeywords={row.matchedKeywords} />

              {/* OCR text panel */}
              {row.ocrText !== null && (
                <div className="mt-3 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Extracted text
                  </p>
                  {row.ocrText.length > 0 ? (
                    <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {row.ocrText}
                    </pre>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">(OCR ran; no text detected.)</p>
                  )}
                </div>
              )}
              {row.ocrText === null && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  OCR not applicable for this file type.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
