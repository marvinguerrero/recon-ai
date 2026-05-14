/**
 * uploadMeta.js — backwards-compatible re-export.
 *
 * Persistence has moved from flat JSON files in uploads/.meta/ to
 * Supabase PostgreSQL (see backend/db/index.js).
 *
 * server.js imports { saveUploadRecord, listUploadRecords, getUploadRecord }
 * from this module unchanged — no routes or callers need to be updated.
 */

module.exports = require('./db')
