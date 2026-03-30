import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();  // ← await here
  const { data, error } = await supabase
    .from('wallpapers_hot_cache')
    .select('*')
    .order('hot_score', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wallpapers: data ?? [] });
}