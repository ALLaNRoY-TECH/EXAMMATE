import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Determine standard origin for redirecting back to app
  let redirectBase = requestUrl.origin;

  if (process.env.NEXT_PUBLIC_SITE_URL && !requestUrl.origin.includes('localhost')) {
    redirectBase = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  return NextResponse.redirect(`${redirectBase}/`);
}
