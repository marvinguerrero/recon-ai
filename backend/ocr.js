/**
 * ocr.js — thin wrapper around tesseract.js for extracting text from images.
 *
 * Why a separate file?
 *   Keeping OCR logic here means server.js stays focused on HTTP routing.
 *   You can swap in a different OCR library later by only editing this file.
 *
 * What it does:
 *   1. Creates one Tesseract Worker (process-wide singleton) the first time it
 *      is needed, so we pay the startup cost only once — not on every request.
 *   2. `extractTextFromImage(filePath)` runs recognition and returns the text
 *      string (empty string on error so one bad file never breaks the response).
 */

const { createWorker } = require("tesseract.js")

/** File extensions that Tesseract can read. SVG and ICO are skipped intentionally. */
const OCR_SUPPORTED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
])

/** Returns true when the stored filename has an extension Tesseract handles. */
function isOcrCandidate(filename) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return OCR_SUPPORTED_EXT.has(ext)
}

/** Lazily-created singleton worker — initialised once, reused for every request. */
let workerPromise = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng")
  }
  return workerPromise
}

/**
 * Run Tesseract OCR on a single image file.
 *
 * @param {string} filePath  Absolute path to the image on disk.
 * @returns {Promise<string>} Extracted text, or an empty string if OCR fails.
 */
async function extractTextFromImage(filePath) {
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(filePath)
    // `data.text` is the full recognised string; trim trailing whitespace.
    return data.text.trim()
  } catch (err) {
    // Log the error so developers can see what went wrong, but don't crash the
    // whole upload — return empty string so the frontend still gets the file info.
    console.error(`OCR failed for ${filePath}:`, err.message)
    return ""
  }
}

module.exports = { isOcrCandidate, extractTextFromImage }
