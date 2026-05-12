import type { UploadedFileInfo } from '../../api/upload'
import { UploadedFileCard } from './UploadedFileCard'

export type UploadedFilesListProps = {
  summary: string
  files: UploadedFileInfo[]
}

export function UploadedFilesList({ summary, files }: UploadedFilesListProps) {
  if (files.length === 0) return null

  return (
    <section
      className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/40"
      aria-labelledby="upload-results-heading"
    >
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2
          id="upload-results-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Uploaded files
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {files.map((file) => (
          <UploadedFileCard key={file.storedName} file={file} />
        ))}
      </div>
    </section>
  )
}
