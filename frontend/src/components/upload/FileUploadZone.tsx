import {
  forwardRef,
  useImperativeHandle,
} from 'react'
import type { UseFileUploadOptions } from './useFileUpload'
import { useFileUpload } from './useFileUpload'
import type { FileCategory, UploadItem } from './types'
import {
  INPUT_ACCEPT,
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
} from './constants'

const categoryLabel: Record<FileCategory, string> = {
  pdf: 'PDF',
  image: 'Image',
  text: 'Text',
}

const categoryStyles: Record<
  FileCategory,
  string
> = {
  pdf:
    'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/25',
  image:
    'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/25',
  text:
    'bg-emerald-500/10 text-emerald-800 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/25',
}

function FileRow({
  item,
  onRemove,
  disabled,
}: {
  item: UploadItem
  onRemove: (id: string) => void
  disabled: boolean
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50"
      data-testid="upload-file-row"
    >
      <span
        className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryStyles[item.kind]}`}
      >
        {categoryLabel[item.kind]}
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-sm text-zinc-800 dark:text-zinc-100">
        {item.file.name}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatFileSize(item.file.size)}
      </span>
      <button
        type="button"
        disabled={disabled}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.file.name}`}
      >
        Remove
      </button>
    </li>
  )
}

export type FileUploadZoneHandle = {
  /** Clears the in-browser queue (does not delete files already on the server). */
  clearQueue: () => void
}

export type FileUploadZoneProps = UseFileUploadOptions & {
  title?: string
  description?: string
  className?: string
  disabled?: boolean
  /** When set, shows an "Upload to server" action that sends the current queue to your API. */
  onServerUpload?: (files: File[]) => Promise<void>
  isUploading?: boolean
  uploadActionLabel?: string
}

export const FileUploadZone = forwardRef<
  FileUploadZoneHandle,
  FileUploadZoneProps
>(function FileUploadZone(
  {
    title = 'Upload documents',
    description = 'Drag multiple files here or browse with multi-select. PDFs, images, and plain text files are supported.',
    className = '',
    disabled = false,
    maxFiles,
    onFilesChange,
    onServerUpload,
    isUploading = false,
    uploadActionLabel = 'Upload to server',
  },
  ref,
) {
  const {
    items,
    errors,
    isDragging,
    inputRef,
    removeFile,
    clearAll,
    openPicker,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onInputChange,
  } = useFileUpload({ maxFiles, onFilesChange })

  useImperativeHandle(ref, () => ({ clearQueue: clearAll }), [clearAll])

  const showDropOverlay = isDragging && !disabled
  const controlsDisabled = disabled || isUploading

  const handleServerUpload = () => {
    if (!onServerUpload || items.length === 0) return
    void onServerUpload(items.map((item) => item.file))
  }

  return (
    <section
      className={`text-left ${className}`}
      aria-labelledby="upload-title"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="upload-title"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 self-start">
            {onServerUpload && (
              <button
                type="button"
                onClick={handleServerUpload}
                disabled={controlsDisabled}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                {isUploading
                  ? 'Uploading…'
                  : items.length > 1
                    ? `Upload ${items.length} files`
                    : uploadActionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={clearAll}
              disabled={controlsDisabled}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div
        role="region"
        aria-label="File drop zone"
        onDragEnter={controlsDisabled ? undefined : onDragEnter}
        onDragLeave={controlsDisabled ? undefined : onDragLeave}
        onDragOver={controlsDisabled ? undefined : onDragOver}
        onDrop={controlsDisabled ? undefined : onDrop}
        className={[
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition',
          controlsDisabled
            ? 'cursor-not-allowed border-zinc-200 bg-zinc-50/50 opacity-60 dark:border-zinc-700 dark:bg-zinc-900/30'
            : showDropOverlay
              ? 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-500/20 dark:border-violet-400 dark:bg-violet-950/40 dark:ring-violet-400/20'
              : 'border-zinc-300 bg-zinc-50/40 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/20 dark:hover:border-zinc-500',
        ].join(' ')}
      >
        {/* `multiple` lets the OS file picker choose more than one file at a time */}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={INPUT_ACCEPT}
          multiple
          disabled={controlsDisabled}
          onChange={onInputChange}
          aria-hidden
          tabIndex={-1}
        />

        <div className="flex flex-col items-center gap-4 px-6 py-14 sm:px-10">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10"
            aria-hidden
          >
            <svg
              className="h-7 w-7 text-violet-600 dark:text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <div className="max-w-md text-center">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {showDropOverlay ? 'Release to add files' : 'Drop files or browse'}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              PDF, PNG, JPG, WebP, SVG, TXT, Markdown, CSV, JSON — up to{' '}
              {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB each. Add many
              files in one go from the file picker or drag-and-drop.
            </p>
          </div>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={openPicker}
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:pointer-events-none disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            Browse files
          </button>
        </div>

        {showDropOverlay && (
          <div
            className="pointer-events-none absolute inset-0 bg-violet-500/5 dark:bg-violet-400/5"
            aria-hidden
          />
        )}
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="font-medium">Could not add some files</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-amber-900/90 dark:text-amber-100/90">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Queued files ({items.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <FileRow
                key={item.id}
                item={item}
                onRemove={removeFile}
                disabled={controlsDisabled}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
})
