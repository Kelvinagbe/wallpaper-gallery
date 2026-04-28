
// app/api/upload/android/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { put }                       from '@vercel/blob';
import FormData                      from 'form-data';

// ─── Settings ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB      = 30;
const MAX_TITLE_LENGTH      = 100;
const MAX_DESC_LENGTH       = 500;

const IP_MAX_UPLOADS        = 10;
const USER_MAX_UPLOADS      = 5;
const RATE_LIMIT_HOURS      = 6;
const AUTO_BLOCK_VIOLATIONS = 3;
const VIOLATION_WINDOW_DAYS = 1;
const IP_CACHE_TTL_MINUTES  = 5;

const NUDITY_THRESHOLD      = 0.45;
const SUGGESTIVE_THRESHOLD  = 0.65;
const OFFENSIVE_THRESHOLD   = 0.60;
const GORE_THRESHOLD        = 0.60;
const WEAPON_THRESHOLD      = 0.80;
const DRUG_THRESHOLD        = 0.75;
const HATE_THRESHOLD        = 0.60;

const VALID_CATEGORIES = [
  'Nature', 'Space', 'Abstract', 'Animals',
  'Architecture', 'City', 'Dark', 'Minimal', 'Other',
] as const;

const VALID_TYPES = ['mobile', 'desktop'] as const;

const ALLOWED_USER_AGENTS = ['Dart/', 'okhttp'];

// ─── Derived ──────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES  = MAX_FILE_SIZE_MB * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;
const IP_CACHE_TTL_MS      = IP_CACHE_TTL_MINUTES * 60 * 1000;

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Env ──────────────────────────────────────────────────────────────────────
const SE_USER   = process.env.SIGHTENGINE_USER!;
const SE_SECRET = process.env.SIGHTENGINE_SECRET!;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL!;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModerationResult {
  safe:       boolean;
  violation?: string;
  reason?:    string;
  details?:   string;
  scores?:    Record<string, number>;
}

// ─── Android check ────────────────────────────────────────────────────────────
function isAndroidRequest(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  return ALLOWED_USER_AGENTS.some((agent) => ua.includes(agent));
}

// ─── Rate limiters ────────────────────────────────────────────────────────────
const uploadRateMap = new Map<string, { count: number; resetAt: number }>();
const userUploadMap = new Map<string, { count: number; resetAt: number }>();

function isIpRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = uploadRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    uploadRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= IP_MAX_UPLOADS) return true;
  entry.count++;
  return false;
}

function isUserRateLimited(userId: string): boolean {
  const now   = Date.now();
  const entry = userUploadMap.get(userId);
  if (!entry || now > entry.resetAt) {
    userUploadMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= USER_MAX_UPLOADS) return true;
  entry.count++;
  return false;
}

// ─── IP Blocklist ─────────────────────────────────────────────────────────────
const blockedIpCache = new Set<string>();
let   cacheLoadedAt  = 0;

async function isIpBlocked(ip: string): Promise<boolean> {
  const now = Date.now();
  if (now - cacheLoadedAt > IP_CACHE_TTL_MS) {
    const { data } = await supabaseAdmin.from('blocked_ips').select('ip');
    if (data) {
      blockedIpCache.clear();
      data.forEach((row: any) => blockedIpCache.add(row.ip));
    }
    cacheLoadedAt = now;
  }
  return blockedIpCache.has(ip);
}

async function checkAndAutoBlock(ip: string, userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - VIOLATION_WINDOW_DAYS);
  const { count } = await supabaseAdmin
    .from('violations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());
  if ((count ?? 0) >= AUTO_BLOCK_VIOLATIONS) {
    await supabaseAdmin
      .from('blocked_ips')
      .upsert({ ip, reason: 'Auto-blocked: repeated violations', blocked_by: 'system' });
    blockedIpCache.add(ip);
  }
}

// ─── JWT verification ─────────────────────────────────────────────────────────
async function verifyUser(req: NextRequest): Promise<{ id: string } | null> {
  const auth  = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

// ─── Moderation ───────────────────────────────────────────────────────────────
async function moderateImage(buffer: Buffer): Promise<ModerationResult> {
  if (!SE_USER || !SE_SECRET) {
    console.warn('[Moderation] Missing credentials — skipping');
    return { safe: true };
  }

  try {
    const form = new FormData();
    form.append('media',      buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('api_user',   SE_USER);
    form.append('api_secret', SE_SECRET);
    form.append('models',     'nudity-2.0,offensive,gore,weapon,drugs,hate-symbols');

    const res  = await fetch('https://api.sightengine.com/1.0/check.json', {
      method:  'POST',
      body:    form as any,
      headers: form.getHeaders(),
    });
    const data = await res.json();

    console.log('[Moderation] nudity scores:', JSON.stringify(data.nudity));

    if (!res.ok || data.status === 'failure') {
      console.error('[Moderation] API rejected:', JSON.stringify(data));
      return { safe: false, reason: '🚫 Moderation check failed', violation: 'moderation_error' };
    }

    const scores:     Record<string, number> = {};
    const violations: string[]               = [];

    const n = data.nudity;
    if (n) {
      scores.sexual_activity = n.sexual_activity ?? 0;
      scores.very_suggestive = n.very_suggestive ?? 0;
      if (
        n.sexual_activity > NUDITY_THRESHOLD ||
        n.sexual_display  > NUDITY_THRESHOLD ||
        n.erotica         > NUDITY_THRESHOLD
      ) violations.push('explicit_nudity');
      else if (n.very_suggestive > SUGGESTIVE_THRESHOLD)
        violations.push('suggestive_nudity');
    }

    const off = data.offensive;
    if (off?.prob > OFFENSIVE_THRESHOLD) { scores.offensive = off.prob; violations.push('offensive'); }

    const gore = data.gore;
    if (gore?.prob > GORE_THRESHOLD) { scores.gore = gore.prob; violations.push('gore'); }

    const weapon = data.weapon;
    if ((weapon?.classes?.firearm ?? 0) > WEAPON_THRESHOLD) { scores.firearm = weapon.classes.firearm; violations.push('weapon'); }

    const drugs = data.drug;
    if (drugs?.prob > DRUG_THRESHOLD) { scores.drugs = drugs.prob; violations.push('drugs'); }

    const hate = data['hate-symbols'];
    if (hate?.prob > HATE_THRESHOLD) { scores.hate_symbols = hate.prob; violations.push('hate_symbol'); }

    if (violations.length === 0) return { safe: true, scores };

    const messages: Record<string, { reason: string; details: string }> = {
      explicit_nudity:   { reason: '🚫 Explicit nudity or sexual content detected',  details: 'This image contains explicit content which violates our Community Guidelines.' },
      suggestive_nudity: { reason: '🚫 Suggestive content detected',                 details: 'Please upload images appropriate for a general audience.' },
      offensive:         { reason: '🚫 Offensive or hateful imagery detected',        details: 'This image contains offensive content that violates our Community Guidelines.' },
      gore:              { reason: '🚫 Graphic violence or gore detected',            details: 'This image contains violent or gory content which violates our Community Guidelines.' },
      weapon:            { reason: '🚫 Illegal weapon imagery detected',              details: 'This image prominently features firearms or illegal weapons.' },
      drugs:             { reason: '🚫 Drug-related content detected',               details: 'This image appears to contain drug paraphernalia or drug use.' },
      hate_symbol:       { reason: '🚫 Hate symbol detected',                        details: 'This image contains symbols associated with hate groups.' },
      moderation_error:  { reason: '🚫 Moderation check failed',                     details: 'We could not verify this image. Please try again.' },
    };

    const primary = violations[0];
    const msg     = messages[primary] ?? { reason: '🚫 Content policy violation', details: 'This image violates our Community Guidelines.' };
    return { safe: false, violation: primary, scores, ...msg };

  } catch (err) {
    console.error('[Moderation] Error:', err);
    return { safe: false, reason: '🚫 Moderation check failed', violation: 'moderation_error' };
  }
}

// ─── Blob upload ──────────────────────────────────────────────────────────────
async function uploadToBlob(
  buffer:   Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const blob = await put(filename, buffer, {
    access:      'public',
    contentType: mimeType,
  });
  return blob.url;
}

// ─── Report violation ─────────────────────────────────────────────────────────
async function reportViolation(userId: string, violation: string) {
  try {
    await fetch(`${APP_URL}/api/report-violation`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, reason: violation }),
    });
  } catch { /* non-critical */ }
}

// ─── Save to DB ───────────────────────────────────────────────────────────────
async function saveToDatabase(payload: {
  userId:       string;
  title:        string;
  description:  string;
  category:     string;
  wallType:     string;
  imageUrl:     string;
  thumbnailUrl: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('wallpapers')
    .insert({
      user_id:       payload.userId,
      title:         payload.title.trim(),
      description:   payload.description.trim() || null,
      image_url:     payload.imageUrl,
      thumbnail_url: payload.thumbnailUrl,
      category:      payload.category || 'Other',
      type:          payload.wallType || 'mobile',
      tags:          [],
      is_public:     true,
      views:         0,
      downloads:     0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── POST /api/upload/android ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    // ── 0. Android check ──────────────────────────────────────────────────────
    if (!isAndroidRequest(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    // ── 1. Get IP ─────────────────────────────────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')
               ?? req.headers.get('x-real-ip')
               ?? 'unknown';

    // ── 2. Check blocked IP ───────────────────────────────────────────────────
    if (await isIpBlocked(ip)) {
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }

    // ── 3. IP rate limit ──────────────────────────────────────────────────────
    if (isIpRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: `Too many uploads. Try again in ${RATE_LIMIT_HOURS} hours.` },
        { status: 429 },
      );
    }

    // ── 4. Verify JWT ─────────────────────────────────────────────────────────
    const verifiedUser = await verifyUser(req);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // ── 5. User rate limit ────────────────────────────────────────────────────
    if (isUserRateLimited(verifiedUser.id)) {
      return NextResponse.json(
        { success: false, error: `Upload limit reached. Max ${USER_MAX_UPLOADS} uploads per ${RATE_LIMIT_HOURS} hours.` },
        { status: 429 },
      );
    }

    // ── 6. Parse form ─────────────────────────────────────────────────────────
    const form = await req.formData();

    const file        = form.get('file')        as File   | null;
    const thumbnail   = form.get('thumbnail')   as File   | null;
    const title       = form.get('title')       as string | null;
    const description = form.get('description') as string ?? '';
    const rawCategory = form.get('category')    as string ?? '';
    const rawWallType = form.get('wallType')     as string ?? 'mobile';

    // ── 7. Validate ───────────────────────────────────────────────────────────
    if (!file || !thumbnail || !title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, thumbnail, title' },
        { status: 400 },
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 },
      );
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Title too long. Maximum ${MAX_TITLE_LENGTH} characters.` },
        { status: 400 },
      );
    }

    if (description.length > MAX_DESC_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Description too long. Maximum ${MAX_DESC_LENGTH} characters.` },
        { status: 400 },
      );
    }

    // ── 8. Sanitize ───────────────────────────────────────────────────────────
    const category = VALID_CATEGORIES.includes(rawCategory as any) ? rawCategory : 'Other';
    const wallType = VALID_TYPES.includes(rawWallType as any)       ? rawWallType : 'mobile';
    const userId   = verifiedUser.id;
    const ts       = Date.now();

    // ── 9. Read buffers ───────────────────────────────────────────────────────
    const mainBuffer  = Buffer.from(await file.arrayBuffer());
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());

    if (mainBuffer.length === 0) {
      return NextResponse.json({ success: false, error: 'Received empty file.' }, { status: 400 });
    }

    // ── 10. Moderate main image ───────────────────────────────────────────────
    const mod = await moderateImage(mainBuffer);
    if (!mod.safe) {
      await reportViolation(userId, mod.violation ?? 'policy');
      await checkAndAutoBlock(ip, userId);
      return NextResponse.json({
        success:   false,
        violation: true,
        error:     mod.reason,
        details:   mod.details,
        scores:    mod.scores,
      }, { status: 422 });
    }

    // ── 11. Upload to Vercel Blob ─────────────────────────────────────────────
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToBlob(mainBuffer,  `wallpapers/${userId}/${ts}-main.jpg`,  'image/jpeg'),
      uploadToBlob(thumbBuffer, `wallpapers/${userId}/${ts}-thumb.jpg`, 'image/jpeg'),
    ]);

    // ── 12. Save to DB ────────────────────────────────────────────────────────
    await saveToDatabase({
      userId,
      title:       title.trim(),
      description: description.trim(),
      category,
      wallType,
      imageUrl,
      thumbnailUrl,
    });

    return NextResponse.json({ success: true, imageUrl, thumbnailUrl });

  } catch (err: any) {
    console.error('[/api/upload/android]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime     = 'nodejs';
export const maxDuration = 60;
