import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid access token' };
  }

  return { user, supabase };
}

export async function POST(req: Request) {
  try {
    const { user, supabase, error: authErr } = await getAuthenticatedUser(req);

    if (authErr || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, keys, userAgent } = await req.json();

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    const { data, error } = await supabase
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
      console.error('[Subscribe API] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscription: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
