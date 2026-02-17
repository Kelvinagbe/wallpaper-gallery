import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { wallpaperId } = await request.json();

    if (!wallpaperId) {
      return NextResponse.json({ error: 'Wallpaper ID is required' }, { status: 400 });
    }

    // Increment view count
    const { error } = await supabase.rpc('increment_views', {
      wallpaper_id: wallpaperId
    });

    if (error) {
      console.error('Failed to increment views:', error);
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing views:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
