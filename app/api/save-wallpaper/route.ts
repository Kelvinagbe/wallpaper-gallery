// app/api/save-wallpaper/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ok  = (data: object)  => NextResponse.json({ success: true,  ...data },         { headers: CORS });
const err = (msg: string, status = 500, extra?: object) =>
  NextResponse.json({ success: false, error: msg, ...extra }, { status, headers: CORS });

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, description, image_url, thumbnail_url, category, type } = body;

    if (!user_id || !title || !image_url)
      return err('Missing required fields: user_id, title, or image_url', 400);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await supabase
      .from('wallpapers')
      .insert({
        user_id,
        title:         title.trim(),
        description:   description?.trim()  || null,
        image_url,
        thumbnail_url: thumbnail_url        || image_url,
        category:      category?.trim()     || 'Other',
        type:          type                 || 'mobile',
        tags:          [],
        is_public:     true,
        views:         0,
        downloads:     0,
      })
      .select()
      .single();

    if (error) return err(error.message, 500, { code: error.code, details: error.details });

    return ok({ data });

  } catch (e: any) {
    return err(e.message || 'Failed to save wallpaper');
  }
}
