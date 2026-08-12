import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWebPush } from '@/lib/push/pushService';

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

    // Fetch ONLY the authenticated user's own push subscriptions
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { error: 'No active push subscriptions found for your account. Click "Enable Notifications" first.' },
        { status: 404 }
      );
    }

    const payload = {
      title: 'ExamMate Notifications Working',
      body: 'Your phone notifications are configured correctly.',
      icon: '/logo.png',
      badge: '/logo.png',
      url: '/',
      tag: 'exammate-test-notification',
    };

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subs) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );

      if (success) {
        sentCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${sentCount} device(s).`,
      sentCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
