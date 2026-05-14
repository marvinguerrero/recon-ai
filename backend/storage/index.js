'use strict'

/**
 * Supabase Storage operations for financial document files.
 *
 * All files go into a private bucket — never publicly accessible.
 * Callers get time-limited signed URLs to read documents.
 *
 * Storage path layout: {documentId}/{storedName}
 *   e.g. doc_abc123/1716700000-123-receipt.jpg
 *
 * Bucket name is read from SUPABASE_STORAGE_BUCKET (default: financial-documents).
 * Create the bucket in Supabase Dashboard → Storage before first use.
 */

const fs = require('fs/promises')
const path = require('path')
const { getSupabaseClient } = require('../lib/supabase')

function bucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'financial-documents'
}

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
}

/**
 * Upload a local file to the private Supabase Storage bucket.
 *
 * Non-fatal: on any error logs a warning and returns null so the upload
 * pipeline continues even if storage is temporarily unavailable.
 *
 * @param {string} localPath  — absolute path to the temp file on disk
 * @param {string} documentId — documentId used as the storage folder prefix
 * @param {string} storedName — multer-generated filename (used as the object name)
 * @returns {Promise<string|null>} storage path (e.g. "doc_x/file.jpg"), or null on failure
 */
async function uploadFile(localPath, documentId, storedName) {
  try {
    const buffer = await fs.readFile(localPath)
    const ext = path.extname(storedName).toLowerCase()
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream'
    const storagePath = `${documentId}/${storedName}`

    const { error } = await getSupabaseClient()
      .storage
      .from(bucket())
      .upload(storagePath, buffer, { contentType, upsert: false })

    if (error) {
      console.error('[storage] upload failed:', error.message)
      return null
    }

    return storagePath
  } catch (err) {
    console.error('[storage] upload error:', err.message)
    return null
  }
}

/**
 * Generate a time-limited signed URL for reading a private document.
 *
 * @param {string} storagePath — value returned by uploadFile()
 * @param {number} [expiresIn=3600] — TTL in seconds (default 1 hour)
 * @returns {Promise<string>} signed URL
 */
async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await getSupabaseClient()
    .storage
    .from(bucket())
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

/**
 * Permanently remove a file from Supabase Storage.
 * Non-fatal: logs and returns on failure.
 *
 * @param {string} storagePath
 */
async function deleteFile(storagePath) {
  const { error } = await getSupabaseClient()
    .storage
    .from(bucket())
    .remove([storagePath])

  if (error) console.error('[storage] delete failed:', error.message)
}

module.exports = { uploadFile, getSignedUrl, deleteFile }
