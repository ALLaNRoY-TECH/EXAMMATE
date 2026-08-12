import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    console.error('[SupabaseAdmin] CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is missing!');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from server environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
