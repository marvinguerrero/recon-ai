/**
 * Supabase anon client for the React frontend.
 *
 * Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY — both are safe to expose
 * in the browser. The anon key has no DB access (RLS blocks everything);
 * all data access goes through the Express API which uses the service-role key.
 *
 * This client is here for future features: auth, realtime subscriptions, etc.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Copy frontend/.env.example → frontend/.env to enable Supabase features.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
