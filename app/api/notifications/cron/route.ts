import { NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/push/pushService';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  // Production security check for Vercel Cron
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('Authorization');

  if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch all scheduled exams
    const { data: exams, error: examErr } = await supabase
      .from('exams')
      .select('*');

    if (examErr || !exams || exams.length === 0) {
      return NextResponse.json({ success: true, processedExams: 0, sentCount: 0 });
    }

    // Centralized India Local Date Calculation (Asia/Kolkata)
    const indiaDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const [todayY, todayM, todayD] = indiaDateStr.split('-').map(Number);
    const todayStart = new Date(todayY, todayM - 1, todayD, 0, 0, 0);

    let sentCount = 0;

    for (const exam of exams) {
      if (!exam.exam_date || !exam.group_id) continue;

      const parts = exam.exam_date.split('-');
      if (parts.length !== 3) continue;

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const targetDayStart = new Date(year, month, day, 0, 0, 0);
      const diffMs = targetDayStart.getTime() - todayStart.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let notificationType: '3_days' | '1_day' | 'exam_day' | null = null;
      let title = '';
      let body = '';
      const examTypeName = exam.exam_type || exam.examType || 'Exam';

      if (diffDays === 3) {
        notificationType = '3_days';
        title = '📚 Exam in 3 Days';
        body = `${exam.subject} — ${examTypeName} is on ${exam.exam_date} at ${exam.start_time || '10:00 AM'}. Time to start revising.`;
      } else if (diffDays === 1) {
        notificationType = '1_day';
        title = '⚠️ Exam Tomorrow';
        body = `${exam.subject} — ${examTypeName} is tomorrow at ${exam.start_time || '10:00 AM'} in ${exam.venue || 'Classroom'}.`;
      } else if (diffDays === 0) {
        notificationType = 'exam_day';
        title = '🔴 Exam Today';
        body = `${exam.subject} — ${examTypeName} is today at ${exam.start_time || '10:00 AM'} in ${exam.venue || 'Classroom'}.`;
      }

      if (!notificationType) continue;

      // 2. Multi-group isolation: Fetch members ONLY for this exam's group
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', exam.group_id);

      if (!members || members.length === 0) continue;

      const memberUserIds = members.map((m: any) => m.user_id);

      // 3. Check user notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, three_days, one_day, exam_day')
        .in('user_id', memberUserIds);

      const prefMap = new Map<string, any>(prefs ? prefs.map((p: any) => [p.user_id, p]) : []);

      const eligibleUserIds = memberUserIds.filter((uid: string) => {
        const p = prefMap.get(uid);
        if (!p) return true; // Default true if no explicit preferences row yet
        if (notificationType === '3_days') return p.three_days !== false;
        if (notificationType === '1_day') return p.one_day !== false;
        if (notificationType === 'exam_day') return p.exam_day !== false;
        return true;
      });

      if (eligibleUserIds.length === 0) continue;

      // 4. Check notification_deliveries to avoid duplicate notifications
      const { data: existingDeliveries } = await supabase
        .from('notification_deliveries')
        .select('user_id')
        .eq('exam_id', exam.id)
        .eq('notification_type', notificationType)
        .in('user_id', eligibleUserIds);

      const alreadySentSet = new Set(existingDeliveries ? existingDeliveries.map((d: any) => d.user_id) : []);
      const usersToNotify = eligibleUserIds.filter((uid: string) => !alreadySentSet.has(uid));

      if (usersToNotify.length === 0) continue;

      // 5. Fetch push subscriptions for eligible group members
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth')
        .in('user_id', usersToNotify);

      if (!subs || subs.length === 0) continue;

      const payload = {
        title,
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        url: '/',
        examId: exam.id,
        tag: `reminder-${exam.id}-${notificationType}`,
      };

      const failedEndpoints: string[] = [];

      for (const sub of subs) {
        try {
          const success = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload
          );

          if (success) {
            sentCount++;
            try {
              await supabase.from('notification_deliveries').upsert(
                {
                  user_id: sub.user_id,
                  exam_id: exam.id,
                  notification_type: notificationType,
                  sent_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,exam_id,notification_type' }
              );
            } catch (delErr) {
              // ignore duplicate key warnings
            }
          } else {
            failedEndpoints.push(sub.endpoint);
          }
        } catch (pushErr) {
          console.error('[Cron] Error pushing to endpoint:', sub.endpoint, pushErr);
          failedEndpoints.push(sub.endpoint);
        }
      }

      // Cleanup stale / expired push subscriptions safely
      if (failedEndpoints.length > 0) {
        try {
          await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
        } catch (cleanErr) {
          console.warn('[Cron] Failed to clean expired endpoints:', cleanErr);
        }
      }
    }

    return NextResponse.json({ success: true, processedExams: exams.length, sentCount });
  } catch (err: any) {
    console.error('[Cron] Exception in handleCron:', err);
    return NextResponse.json({ error: err.message || 'Cron execution failed' }, { status: 500 });
  }
}
