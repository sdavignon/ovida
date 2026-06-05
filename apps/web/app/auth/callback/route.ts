import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const isStaticExport = process.env.NEXT_SHOULD_EXPORT === 'true';

export async function GET(request: Request) {
  if (isStaticExport) {
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';
    return NextResponse.redirect(new URL('/admin', origin));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/admin', requestUrl.origin));
}
