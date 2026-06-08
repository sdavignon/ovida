import { NextResponse } from 'next/server';
import { apiOrigin } from '@/lib/config';

const isStaticExport = process.env.NEXT_SHOULD_EXPORT === 'true';

export async function GET(request: Request) {
  if (isStaticExport) {
    return NextResponse.json({ user: null, profile: null });
  }

  const accessToken = request.headers.get('sb-access-token');

  if (!accessToken) {
    return NextResponse.json({ user: null, profile: null });
  }

  try {
    const response = await fetch(`${apiOrigin}/v1/auth/session`, {
      headers: {
        'sb-access-token': accessToken,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ user: null, profile: null }, { status: 500 });
  }
}
