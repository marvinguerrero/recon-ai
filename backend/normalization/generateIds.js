const { randomBytes } = require('crypto')

function generateDocumentId() {
  return 'doc_' + randomBytes(6).toString('hex')
}

function generateTransactionId() {
  return 'txn_' + randomBytes(6).toString('hex')
}

module.exports = { generateDocumentId, generateTransactionId }
