import type { ChangeEvent, DragEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import type { UploadItem } from './types'
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
  getFileCategory,
  isAcceptedFile,
} from './constants'

export type UseFileUploadOptions = {
  maxFiles?: number
  onFilesChange?: (files: File[]) => void
}

type ProcessResult = { next: UploadItem[]; errors: string[] }

let uploadIdFallbackSeq = 0

/** Stable unique id for list keys; avoids `crypto.randomUUID` on insecure origins. */
function newUploadItemId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }
  uploadIdFallbackSeq += 1
  return `upload-${Date.now()}-${uploadIdFallbackSeq}-${Math.random().toString(36).slice(2, 11)}`
}

function fileFingerprint(file: File): string {
  return `${file.name}\0${file.size}\0${file.lastModified}`
}

function processIncoming(
  prev: UploadItem[],
  incoming: File[],
  maxFiles: number,
): ProcessResult {
  const errors: string[] = []
  const toAdd: UploadItem[] = []
  let room = maxFiles - prev.length
  const seen = new Set(prev.map((p) => fileFingerprint(p.file)))

  if (room <= 0) {
    return {
      next: prev,
      errors: [`You can upload at most ${maxFiles} files.`],
    }
  }

  for (const file of incoming) {
    const fp = fileFingerprint(file)
    if (seen.has(fp)) {
      continue
    }
    seen.add(fp)
    if (room <= 0) {
      errors.push(`Some files were skipped (limit: ${maxFiles}).`)
      break
    }
    if (!isAcceptedFile(file)) {
      errors.push(
        `"${file.name}" is not a supported PDF, image, or text file.`,
      )
      continue
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(
        `"${file.name}" is larger than the ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB limit.`,
      )
      continue
    }
    const kind = getFileCategory(file)
    if (!kind) {
      errors.push(`"${file.name}" could not be processed.`)
      continue
    }
    toAdd.push({
      id: newUploadItemId(),
      file,
      kind,
    })
    room -= 1
  }

  const next = [...prev, ...toAdd]
  return { next, errors: errors.slice(0, 8) }
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { maxFiles = MAX_FILES_PER_UPLOAD, onFilesChange } = options
  const [items, setItems] = useState<UploadItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList)
      setItems((prev) => {
        const { next, errors } = processIncoming(prev, incoming, maxFiles)
        queueMicrotask(() => {
          setErrors(errors)
          onFilesChange?.(next.map((item) => item.file))
        })
        return next
      })
    },
    [maxFiles, onFilesChange],
  )

  const removeFile = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id)
        queueMicrotask(() => {
          setErrors([])
          onFilesChange?.(next.map((item) => item.file))
        })
        return next
      })
    },
    [onFilesChange],
  )

  const clearAll = useCallback(() => {
    setItems([])
    setErrors([])
    onFilesChange?.([])
  }, [onFilesChange])

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDragging(false)
    }
  }, [])

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0
      setIsDragging(false)
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files)
      e.target.value = ''
    },
    [addFiles],
  )

  return {
    items,
    errors,
    isDragging,
    inputRef,
    addFiles,
    removeFile,
    clearAll,
    openPicker,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onInputChange,
  }
}
