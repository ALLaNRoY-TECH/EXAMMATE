import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export function getSupabaseAdmin() {
  const keyToUse = serviceRoleKey || publishableKey;
  return createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
