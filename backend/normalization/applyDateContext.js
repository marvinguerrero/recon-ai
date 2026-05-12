/**
 * applyDateContext.js — given pre-scanned date anchors and a line index,
 * return the active date at that position (the most recent anchor at or before lineIdx).
 */

/**
 * @param {Array<{ lineIdx: number, date: string }>} anchors — sorted ascending by lineIdx
 * @param {number} lineIdx — the line index of the merchant
 * @returns {string|null} ISO date string, or null if no anchor precedes lineIdx
 */
function applyDateContext(anchors, lineIdx) {
  let active = null
  for (const { lineIdx: anchorIdx, date } of anchors) {
    if (anchorIdx <= lineIdx) active = date
    else break
  }
  return active
}

module.exports = { applyDateContext }
