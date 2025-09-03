import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

// Service-role Supabase client for background jobs (no cookies context required)
export function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error('SUPABASE_URL not set');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'video-pipeline-admin' } }
  });
}
