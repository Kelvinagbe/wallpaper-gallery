// app/api/save-wallpaper/route.ts
// This API route saves wallpaper data to Supabase using the service role key

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Saving wallpaper to database...');

    const body = await request.json();
    const { user_id, title, description, image_url, thumbnail_url } = body;

    // Validate required fields
    if (!user_id || !title || !image_url) {
      console.log('❌ Validation failed');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, title, or image_url' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📋 Data to save:', { user_id, title, image_url });

    // Create Supabase client with SERVICE ROLE KEY (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Insert into database
    const { data, error } = await supabase
      .from('wallpapers')
      .insert({
        user_id,
        title: title.trim(),
        description: description?.trim() || null,
        image_url,
        thumbnail_url: thumbnail_url || image_url,
        category: 'Other',
        tags: [],
        is_public: true,
        views: 0,
        downloads: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          code: error.code,
          details: error.details 
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Database save successful!');
    console.log('📋 Record:', data);

    return NextResponse.json(
      { 
        success: true, 
        data 
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Save failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save wallpaper'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}