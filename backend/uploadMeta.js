/**
 * uploadMeta.js — persist one JSON record per uploaded file (including OCR text).
 *
 * Where data lives:
 *   `backend/uploads/.meta/<storedName>.json`
 * Each file sits next to the naming scheme multer uses, so you can find metadata
 * for `uploads/123-456-photo.jpg` at `uploads/.meta/123-456-photo.jpg.json`.
 *
 * Later you can swap this module for a database without changing the HTTP routes much.
 */

const path = require("path")
const fs = require("fs/promises")

const UPLOAD_DIR = path.join(__dirname, "uploads")
const META_DIR = path.join(UPLOAD_DIR, ".meta")

async function ensureMetaDir() {
  await fs.mkdir(META_DIR, { recursive: true })
}

/**
 * @param {{
 *   storedName: string
 *   originalName: string
 *   size: number
 *   ocrText: string | null
 * }} record
 */
async function saveUploadRecord(record) {
  await ensureMetaDir()
  const safeName = path.basename(record.storedName)
  const filePath = path.join(META_DIR, `${safeName}.json`)
  const payload = {
    ...record,
    savedAt: new Date().toISOString(),
  }
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8")
}

/** @returns {Promise<Array<{ storedName: string, originalName: string, size: number, ocrText: string | null, savedAt: string }>>} */
async function listUploadRecords() {
  try {
    const names = await fs.readdir(META_DIR)
    const jsonFiles = names.filter((n) => n.endsWith(".json"))
    const rows = await Promise.all(
      jsonFiles.map(async (name) => {
        const raw = await fs.readFile(path.join(META_DIR, name), "utf8")
        return JSON.parse(raw)
      }),
    )
    rows.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    return rows
  } catch (err) {
    if (err.code === "ENOENT") return []
    throw err
  }
}

/** @param {string} storedName multer filename on disk */
async function getUploadRecord(storedName) {
  const safeName = path.basename(storedName)
  const filePath = path.join(META_DIR, `${safeName}.json`)
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw)
}

module.exports = {
  META_DIR,
  saveUploadRecord,
  listUploadRecords,
  getUploadRecord,
}
