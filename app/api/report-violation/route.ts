// app/api/report-violation/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const SUSPENSION_DAYS       = 7;
const VIOLATIONS_BEFORE_BAN = 3;

export async function POST(request: NextRequest) {
  try {
    const { user_id, reason } = await request.json();
    if (!user_id || !reason) return NextResponse.json({ error: 'Missing user_id or reason' }, { status: 400, headers: corsHeaders });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get current profile
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('violations, suspended_until')
      .eq('id', user_id)
      .single();

    if (fetchErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });

    const newViolations = (profile.violations ?? 0) + 1;
    const isSuspended   = newViolations >= VIOLATIONS_BEFORE_BAN;

    const suspendedUntil = isSuspended
      ? new Date(Date.now() + SUSPENSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : profile.suspended_until;

    // Update profile — increment violations, set suspension if threshold hit
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        violations:      newViolations,
        suspended_until: isSuspended ? suspendedUntil : profile.suspended_until,
      })
      .eq('id', user_id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500, headers: corsHeaders });

    return NextResponse.json({
      success:      true,
      violations:   newViolations,
      suspended:    isSuspended,
      suspendedUntil,
      reason,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('report-violation error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500, headers: corsHeaders });
  }
}
