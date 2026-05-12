export type FileCategory = 'pdf' | 'image' | 'text'

export type UploadItem = {
  id: string
  file: File
  kind: FileCategory
}
