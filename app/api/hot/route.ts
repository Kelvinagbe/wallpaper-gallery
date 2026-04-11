import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wallpapers_hot_cache')
    .select('*')
    .order('hot_score', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { wallpapers: data ?? [] },
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    }
  );
}
