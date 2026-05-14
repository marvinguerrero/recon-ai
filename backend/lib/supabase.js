'use strict'

/**
 * Supabase service-role client for the Express backend.
 *
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — never exposed to the browser.
 * The service role bypasses Row-Level Security, so this client has full DB access.
 *
 * autoRefreshToken and persistSession are disabled because the backend is stateless;
 * detectSessionInUrl is disabled because there is no browser context.
 */

const { createClient } = require('@supabase/supabase-js')

let _client = null

function getSupabaseClient() {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. ' +
      'Copy backend/.env.example → backend/.env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return _client
}

module.exports = { getSupabaseClient }
