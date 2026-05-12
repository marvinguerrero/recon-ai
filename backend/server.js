const path = require("path")
const fs = require("fs")
const express = require("express")
const cors = require("cors")
const multer = require("multer")
const { isOcrCandidate, extractTextFromImage } = require("./ocr")
const {
  saveUploadRecord,
  listUploadRecords,
  getUploadRecord,
} = require("./uploadMeta")

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
app.post("/api/upload", (req, res, next) => {
  upload.array("files", MAX_FILES_PER_UPLOAD)(req, res, async (err) => {
    if (err) return next(err)
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files received. Use the form field name 'files'.",
      })
    }

    // Run OCR on every image file in parallel — non-images get null immediately.
    const fileInfos = await Promise.all(
      files.map(async (f) => {
        const filePath = path.join(UPLOAD_DIR, f.filename)
        const ocrText = isOcrCandidate(f.filename)
          ? await extractTextFromImage(filePath)
          : null

        return {
          originalName: f.originalname,
          storedName: f.filename,
          size: f.size,
          // `ocrText` is a string when OCR ran (may be empty if no text found),
          // or null for PDFs and text files where OCR is not applicable.
          ocrText,
        }
      }),
    )

    // Persist each row so GET /api/uploads can load history later (not only in memory).
    await Promise.all(
      fileInfos.map((info) =>
        saveUploadRecord({
          storedName: info.storedName,
          originalName: info.originalName,
          size: info.size,
          ocrText: info.ocrText,
        }),
      ),
    )

    return res.status(200).json({
      success: true,
      message: `Saved ${files.length} file(s) to the uploads folder.`,
      filenames: fileInfos.map((info) => info.storedName),
      files: fileInfos,
    })
  })
})

/**
 * GET /api/uploads — all saved upload records (newest first), including `ocrText`.
 * Data is read from `backend/uploads/.meta/*.json` (see `uploadMeta.js`).
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
  console.log(`Server running on port ${PORT}`)
  console.log(`Uploads directory: ${UPLOAD_DIR}`)
})
