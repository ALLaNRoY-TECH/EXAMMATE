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

export async function GET(req: Request) {
  try {
    const { user, supabase, error: authErr } = await getAuthenticatedUser(req);
    if (authErr || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      threeDays: data ? data.three_days : true,
      oneDay: data ? data.one_day : true,
      examDay: data ? data.exam_day : true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase, error: authErr } = await getAuthenticatedUser(req);
    if (authErr || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threeDays, oneDay, examDay } = await req.json();

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          three_days: threeDays !== undefined ? threeDays : true,
          one_day: oneDay !== undefined ? oneDay : true,
          exam_day: examDay !== undefined ? examDay : true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
