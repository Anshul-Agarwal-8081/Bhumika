import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasSupabase } from './env.js'

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  if (!hasSupabase) throw Object.assign(new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env.'), { statusCode: 503 })
  return createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

export function createSupabaseAdminClient(): SupabaseClient {
  if (!hasSupabase || !env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('Supabase admin operations are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.'), { statusCode: 503 })
  return createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
