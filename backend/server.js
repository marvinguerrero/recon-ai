require("dotenv").config()

const path = require("path")
const fs = require("fs")
const express = require("express")
const cors = require("cors")
const multer = require("multer")
const { rateLimit } = require("express-rate-limit")
const { isOcrCandidate, extractTextFromImage } = require("./ocr")
const { classifyDocument } = require("./classification/classifyDocument")
const { extractFields } = require("./normalization/extractFields")
const { generateDocumentId } = require("./normalization/generateIds")
const { buildTransactionRows } = require("./normalization/buildTransactionRows")
const { saveUploadRecord, listUploadRecords, getUploadRecord } = require("./uploadMeta")
const { uploadFile, getSignedUrl } = require("./storage")

const app = express()

const UPLOAD_DIR = path.join(__dirname, "uploads")
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const MAX_BYTES = 50 * 1024 * 1024
/** Same cap as `MAX_FILES_PER_UPLOAD` in the React upload constants. */
const MAX_FILES_PER_UPLOAD = 100

/** Same rules as the React client: PDF, images, common text-based files. */
function isAllowedFile(file) {
  const ext = path.extname(file.originalname).toLowerCase()
  const mime = (file.mimetype || "").toLowerCase()

  const imageExt = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
  ])
  const textExt = new Set([
    ".txt",
    ".md",
    ".csv",
    ".tsv",
    ".json",
    ".xml",
    ".log",
  ])

  if (mime === "application/pdf" || ext === ".pdf") return true
  if (mime.startsWith("image/") || imageExt.has(ext)) return true
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    textExt.has(ext)
  ) {
    return true
  }
  return false
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname)
    const stamp = Date.now()
    const random = Math.round(Math.random() * 1e9)
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^\w.\-]+/g, "_")
    cb(null, `${stamp}-${random}-${safeBase}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter(_req, file, cb) {
    if (isAllowedFile(file)) {
      cb(null, true)
    } else {
      cb(new Error("File type is not allowed."))
    }
  },
})

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
  res.json({
    message: "ReconAI Backend Running",
    status: "online",
  })
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads. Try again in a minute." },
})

/**
 * POST /api/upload — save files, then OCR any images.
 *
 * How it works:
 * 1. The React app builds FormData, appending each File under the field name "files".
 * 2. multer saves every accepted file to `uploads/` with a unique name.
 * 3. For each saved file that is an image (jpg/png/webp/…), we run Tesseract OCR
 *    and include the extracted text as `ocrText` in that file's response entry.
 *    Non-image files get `ocrText: null` so the shape is always the same.
 */
app.post("/api/upload", uploadLimiter, (req, res, next) => {
  upload.array("files", MAX_FILES_PER_UPLOAD)(req, res, async (err) => {
    if (err) return next(err)
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files received. Use the form field name 'files'.",
      })
    }

    // Process each file: OCR + Supabase Storage upload run in parallel.
    const fileInfos = await Promise.all(
      files.map(async (f) => {
        const filePath = path.join(UPLOAD_DIR, f.filename)
        const documentId = generateDocumentId()

        // OCR (image → text) and cloud storage upload run concurrently.
        const [ocrText, storagePath] = await Promise.all([
          isOcrCandidate(f.filename) ? extractTextFromImage(filePath) : Promise.resolve(null),
          uploadFile(filePath, documentId, f.filename),
        ])

        // Remove the local temp file once it is safely in cloud storage.
        if (storagePath) {
          fs.promises.unlink(filePath).catch((e) =>
            console.warn("[cleanup] could not delete temp file:", e.message),
          )
        }

        const classification = classifyDocument(ocrText)
        const structuredData = extractFields(ocrText, classification.category)
        const transactions = buildTransactionRows({
          documentId,
          sourceFile: f.filename,
          originalName: f.originalname,
          category: classification.category,
          confidence: classification.confidence,
          ocrText,
          structuredData,
        })

        return {
          documentId,
          originalName: f.originalname,
          storedName: f.filename,
          size: f.size,
          ocrText,
          storagePath,
          ...classification,
          structuredData,
          transactions,
          transactionCount: transactions.length,
        }
      }),
    )

    // Persist each document + transactions to Supabase PostgreSQL.
    await Promise.all(
      fileInfos.map((info) =>
        saveUploadRecord({
          documentId: info.documentId,
          storedName: info.storedName,
          originalName: info.originalName,
          size: info.size,
          ocrText: info.ocrText,
          category: info.category,
          confidence: info.confidence,
          matchedKeywords: info.matchedKeywords,
          structuredData: info.structuredData,
          transactions: info.transactions,
          transactionCount: info.transactionCount,
          storagePath: info.storagePath,
        }),
      ),
    )

    // After saving, reload all records so duplicateCount reflects the global state.
    const allRecords = await listUploadRecords()
    const txnCountMap = new Map(
      allRecords.flatMap((r) => (r.transactions ?? []).map((tx) => [tx.transactionId, tx.duplicateCount ?? 1])),
    )

    const enrichedFileInfos = fileInfos.map((info) => ({
      ...info,
      transactions: info.transactions.map((tx) => ({
        ...tx,
        duplicateCount: txnCountMap.get(tx.transactionId) ?? 1,
      })),
    }))

    return res.status(200).json({
      success: true,
      message: `Saved ${files.length} file(s).`,
      filenames: enrichedFileInfos.map((info) => info.storedName),
      files: enrichedFileInfos,
    })
  })
})

/**
 * GET /api/uploads — all saved upload records (newest first), including `ocrText`.
 * Data is read from Supabase PostgreSQL (documents + transactions tables).
 */
app.get("/api/uploads", async (_req, res, next) => {
  try {
    const uploads = await listUploadRecords()
    return res.status(200).json({ success: true, uploads })
  } catch (err) {
    return next(err)
  }
})

/**
 * GET /api/uploads/:storedName/url — short-lived signed URL for a private document.
 *
 * The file lives in a private Supabase Storage bucket and is never publicly
 * accessible. Call this endpoint to get a 1-hour signed URL for viewing it.
 */
app.get("/api/uploads/:storedName/url", async (req, res, next) => {
  try {
    const record = await getUploadRecord(req.params.storedName)
    if (!record.storagePath) {
      return res.status(404).json({
        success: false,
        message: "This file has no cloud storage entry. It may have been uploaded before storage was enabled.",
      })
    }
    const signedUrl = await getSignedUrl(record.storagePath)
    return res.status(200).json({ success: true, signedUrl, expiresIn: 3600 })
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ success: false, message: "No record for that file." })
    }
    return next(err)
  }
})

/**
 * GET /api/uploads/:storedName — one record by the on-disk filename multer generated.
 */
app.get("/api/uploads/:storedName", async (req, res, next) => {
  try {
    const record = await getUploadRecord(req.params.storedName)
    return res.status(200).json({ success: true, upload: record })
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "No saved metadata for that file.",
      })
    }
    return next(err)
  }
})

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `Each file must be ${MAX_BYTES / (1024 * 1024)} MB or smaller.`,
      })
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: `Too many files at once. You can send up to ${MAX_FILES_PER_UPLOAD} files per request.`,
      })
    }
    return res.status(400).json({ success: false, message: err.message })
  }
  if (err && err.message === "File type is not allowed.") {
    return res.status(400).json({ success: false, message: err.message })
  }
  console.error(err)
  return res.status(500).json({
    success: false,
    message: "Something went wrong while uploading.",
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`ReconAI backend running on port ${PORT}`)
})
