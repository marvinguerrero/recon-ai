import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadFiles, type UploadApiSuccess } from './api/upload'
import {
  fetchUploadLibrary,
  type SavedUploadRecord,
} from './api/uploadsLibrary'
import {
  FileUploadZone,
  SavedUploadsLibrary,
  UploadedFilesList,
  type FileUploadZoneHandle,
} from './components/upload'

function App() {
  const zoneRef = useRef<FileUploadZoneHandle>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lastUpload, setLastUpload] = useState<UploadApiSuccess | null>(null)

  const [library, setLibrary] = useState<SavedUploadRecord[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true)
    setLibraryError(null)
    try {
      setLibrary(await fetchUploadLibrary())
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Could not load saved uploads.')
    } finally {
      setLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const onFilesChange = useCallback(() => {
    setUploadError(null)
    setLastUpload(null)
  }, [])

  const onServerUpload = useCallback(async (files: File[]) => {
    setUploadError(null)
    setLastUpload(null)
    setIsUploading(true)
    try {
      const result = await uploadFiles(files)
      setLastUpload(result)
      zoneRef.current?.clearQueue()
      void loadLibrary()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed.'
      setUploadError(message)
    } finally {
      setIsUploading(false)
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-zinc-50 text-left dark:bg-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white/80 px-4 py-6 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            ReconAI
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
            Ingest documents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Queue PDFs, images, or text files, then send them to the Express API.
            In development, run the backend on port{' '}
            <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-zinc-800">
              5000
            </code>{' '}
            and the Vite dev server will proxy{' '}
            <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-zinc-800">
              /api
            </code>{' '}
            to it.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
        <FileUploadZone
          ref={zoneRef}
          title="Upload documents"
          description="Drag several files at once, or use Browse and multi-select. When the queue looks right, upload once to save them all under backend/uploads."
          onFilesChange={onFilesChange}
          onServerUpload={onServerUpload}
          isUploading={isUploading}
        />

        {lastUpload && (
          <div role="status" aria-live="polite">
            <UploadedFilesList
              summary={lastUpload.message}
              files={lastUpload.files}
            />
          </div>
        )}

        <SavedUploadsLibrary
          records={library}
          loading={libraryLoading}
          error={libraryError}
          onRefresh={() => void loadLibrary()}
        />

        {uploadError && (
          <p
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {uploadError}
          </p>
        )}
      </main>

      <footer className="border-t border-zinc-200/80 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        ReconAI · Files are stored in{' '}
        <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-zinc-800">
          backend/uploads
        </code>
        . For other deployments, set{' '}
        <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-zinc-800">
          VITE_API_BASE_URL
        </code>{' '}
        on the frontend.
      </footer>
    </div>
  )
}

export default App
