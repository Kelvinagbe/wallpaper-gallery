import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const supabase = await createClient();

  const { data: wp } = await supabase
    .from('wallpapers')
    .select('title, description, url, uploaded_by, likes')
    .eq('id', id)
    .single();

  if (!wp) {
    return new Response('Not found', { status: 404 });
  }

  return Response.redirect(wp.url, 302);
}