import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;

  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/) || cookieHeader.match(/sb-access-token=([^;]+)/);
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        token = parsed.access_token || parsed[0] || match[1];
      } catch {
        token = match[1];
      }
    }
  }

  if (!token) return { user: null, error: 'Missing access token' };

  // Validate JWT token against Supabase Auth API using publishable client
  const authClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid access token' };
  }

  return { user };
}

export async function POST(req: Request) {
  try {
    const { user, error: authErr } = await getAuthenticatedUser(req);

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, keys, userAgent } = await req.json();

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const serviceRoleKeyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 8)
      : null;

    console.log('[PushDebug] subscribe', {
      authenticatedUserId: user.id,
      usingAdminClient: true,
      hasServiceRoleKey,
      serviceRoleKeyPrefix,
      supabaseUrl,
    });

    // Obtain server-only admin client
    let adminSupabase;
    try {
      adminSupabase = getSupabaseAdmin();
    } catch (err: any) {
      console.error('[Subscribe API] Admin client creation error:', err.message);
      return NextResponse.json(
        {
          error: err.message,
          diagnostics: {
            hasServiceRoleKey,
            serviceRoleKeyPrefix,
            supabaseUrl,
          },
        },
        { status: 500 }
      );
    }

    const { data, error } = await adminSupabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Subscribe API] Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        hasServiceRoleKey,
      });
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          diagnostics: {
            hasServiceRoleKey,
            serviceRoleKeyPrefix,
            supabaseUrl,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (err: any) {
    console.error('[Subscribe API] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
