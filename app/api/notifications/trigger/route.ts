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

    const { type, exam, groupId } = await req.json();

    if (!type || !exam || !groupId) {
      return NextResponse.json({ error: 'Missing type, exam, or groupId' }, { status: 400 });
    }

    // 1. Fetch group members
    const { data: members, error: memErr } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (memErr || !members) {
      return NextResponse.json({ error: memErr?.message || 'Failed to fetch group members' }, { status: 500 });
    }

    // Exclude creator for new_exam
    let targetUserIds = members.map((m: any) => m.user_id);
    if (type === 'new_exam') {
      targetUserIds = targetUserIds.filter((uid: string) => uid !== user.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No other group members to notify' });
    }

    // 2. Fetch push subscriptions for target user IDs
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds);

    if (subErr || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: 'No active push subscriptions for members' });
    }

    // Determine notification payload title & body
    let title = 'Exam Notification';
    let body = `${exam.subject} — ${exam.examType}`;

    if (type === 'new_exam') {
      title = 'New Exam Added';
      body = `${exam.subject} — ${exam.examType} scheduled on ${exam.date} at ${exam.startTime || '10:00 AM'}.`;
    } else if (type === 'updated_exam') {
      title = 'Exam Updated';
      body = `${exam.subject} has been updated. Check the new exam details.`;
    } else if (type === 'deleted_exam') {
      title = 'Exam Removed';
      body = `${exam.subject} — ${exam.examType} has been removed from your schedule.`;
    }

    const payload = {
      title,
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      url: '/',
      examId: exam.id,
      tag: `exam-${exam.id}-${type}`,
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
        // Log delivery record
        try {
          await supabase.from('notification_deliveries').upsert(
            {
              user_id: sub.user_id,
              exam_id: exam.id,
              notification_type: type,
              sent_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,exam_id,notification_type' }
          );
        } catch (delErr) {
          // ignore duplicate insert errors
        }
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
