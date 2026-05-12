# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Express, Node.js — run from `backend/`)
```bash
npm run dev    # nodemon — auto-restarts on change (port 5000)
npm start      # node server.js (production)
```

### Frontend (React + Vite — run from `frontend/`)
```bash
npm run dev    # Vite dev server (port 5173), proxies /api → localhost:5000
npm run build  # tsc -b && vite build
npm run lint   # eslint
```

Both servers must run simultaneously in development. The frontend Vite config proxies all `/api` requests to `http://localhost:5000`, so there is no CORS configuration needed in dev.

## Architecture

ReconAI is a document ingestion and financial reconciliation tool. Users upload images/PDFs of receipts, statements of account (SOA), and invoices. The backend runs OCR, classifies each document, extracts structured financial data, normalizes it into transaction rows, and flags duplicates.

### Backend pipeline (`backend/`)

Each uploaded file flows through this sequential pipeline in `server.js`:

1. **OCR** (`ocr.js`) — Tesseract.js extracts text from image files (jpg/png/webp/etc.). Non-images get `ocrText: null`.
2. **Classification** (`classification/`) — Keyword scoring assigns a `category` (`receipt`, `soa`, `invoice`, `uncategorized`) and `confidence` (0–1).
   - `keywordRules.js` — weighted keyword lists per category (primary +2, secondary +1, negative -2). Adding a new category only requires adding an entry here.
   - `scoringEngine.js` — applies the weights.
   - `classifyDocument.js` — orchestrates scoring; has a multi-merchant override that forces `soa` when 2+ distinct purchases are detected.
3. **Normalization** (`normalization/`) — Extracts structured fields from OCR text.
   - `extractFields.js` — dispatches to category-specific extractors.
   - `extractSoaTransactions.js` — parses multi-row SOA documents into individual merchant/amount pairs.
   - `extractReceiptTransaction.js` — single-purchase extraction.
   - `buildTransactionRows.js` — flattens everything into a uniform `TransactionRow` array (SOA → N rows, receipt/invoice → 1 row).
4. **Deduplication** (`deduplication/`) — `detectDuplicateTransactions.js` annotates every transaction with `duplicateCount` (how many transactions across all uploads share the same normalized key). Count of 1 = unique. Records are never deleted.
5. **Persistence** (`uploadMeta.js`) — Each upload is stored as a JSON file at `backend/uploads/.meta/<storedName>.json`. This is a flat-file "database" that can be swapped for a real DB without touching HTTP routes.

### Frontend (`frontend/src/`)

- **`App.tsx`** — root; owns all state (`library`, `lastUpload`, `isUploading`). Renders two views: `ingest` and `dashboard`.
- **`api/upload.ts`** — typed wrappers for `POST /api/upload`. Contains all shared TypeScript types (`TransactionRow`, `UploadedFileInfo`, `StructuredData`, etc.).
- **`api/uploadsLibrary.ts`** — typed wrapper for `GET /api/uploads`.
- **`components/upload/`** — Ingest view components: `FileUploadZone` (drag-and-drop queue), `UploadedFilesList` (last upload results), `SavedUploadsLibrary` (history), `UploadedFileCard`, `StructuredDataCard`, `ClassificationConfidence`, `DocumentCategoryBadge`.
- **`components/dashboard/`** — `DashboardView`, `StatCard`, `CategoryBreakdown`, `TransactionsTable`.
- **`components/transactions/`** — `TransactionLedger`.

### Key data shapes

`TransactionRow` (the core normalized unit — defined in `frontend/src/api/upload.ts`):
```
transactionId, documentId, sourceFile, originalName,
category, merchant, amount, currency, transactionDate,
referenceNumber, confidenceScore, duplicateGroupId,
rawOcrText, duplicateCount
```

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend | Express listen port (default 5000) |
| `VITE_API_BASE_URL` | frontend | Override API origin for non-local deployments |

### File storage

Uploaded files: `backend/uploads/<timestamp>-<random>-<safeName>.<ext>`  
Upload metadata: `backend/uploads/.meta/<storedName>.json`
