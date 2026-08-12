import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWebPush } from '@/lib/push/pushService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export async function GET(req: Request) {
  return handleCron();
}

export async function POST(req: Request) {
  return handleCron();
}

async function handleCron() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch all exams
    const { data: exams, error: examErr } = await supabase
      .from('exams')
      .select('*');

    if (examErr || !exams || exams.length === 0) {
      return NextResponse.json({ success: true, processedExams: 0, sentCount: 0 });
    }

    const now = new Date();
    // India local date calculation (UTC + 5:30)
    const indiaNowMs = now.getTime() + (5.5 * 60 * 60 * 1000);
    const indiaNow = new Date(indiaNowMs);

    const todayStart = new Date(indiaNow.getFullYear(), indiaNow.getMonth(), indiaNow.getDate(), 0, 0, 0);

    let sentCount = 0;

    for (const exam of exams) {
      if (!exam.exam_date) continue;

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

      if (diffDays === 3) {
        notificationType = '3_days';
        title = '📚 Exam in 3 Days';
        body = `${exam.subject} — ${exam.examType} is on ${exam.exam_date} at ${exam.start_time || '10:00 AM'}. Time to start revising.`;
      } else if (diffDays === 1) {
        notificationType = '1_day';
        title = '⚠️ Exam Tomorrow';
        body = `${exam.subject} — ${exam.examType} is tomorrow at ${exam.start_time || '10:00 AM'} in ${exam.venue || 'Classroom'}.`;
      } else if (diffDays === 0) {
        notificationType = 'exam_day';
        title = '🔴 Exam Today';
        body = `${exam.subject} — ${exam.examType} is today at ${exam.start_time || '10:00 AM'} in ${exam.venue || 'Classroom'}.`;
      }

      if (!notificationType) continue;

      // 2. Fetch members of exam's group
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', exam.group_id);

      if (!members || members.length === 0) continue;

      const memberUserIds = members.map((m: any) => m.user_id);

      // 3. Check notification preferences for members
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

      // 5. Fetch push subscriptions for usersToNotify
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
            // ignore duplicates
          }
        } else {
          failedEndpoints.push(sub.endpoint);
        }
      }

      if (failedEndpoints.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
      }
    }

    return NextResponse.json({ success: true, processedExams: exams.length, sentCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Cron error' }, { status: 500 });
  }
}
