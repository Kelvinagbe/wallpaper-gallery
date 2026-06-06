// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// ── Env (read lazily at request time, not at build time) ─────────
// requireEnv() must NOT be called at module level — Vercel only
// injects env vars at runtime, not during "next build".
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const MAX_W   = 1920;
const MAX_H   = 1080;
const THUMB_W = 400;

// Supabase client is created lazily inside getSupabase() for the same reason.
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabase;
}

// ── Types ────────────────────────────────────────────────────────
interface ModerationResult {
  safe:       boolean;
  violation?: string;
  reason?:    string;
  details?:   string;
  scores?:    Record<string, number>;
}

// ── Moderation ───────────────────────────────────────────────────
async function moderateImage(buffer: Buffer, mimeType: string): Promise<ModerationResult> {
  const SE_USER   = process.env.SIGHTENGINE_USER   ?? '';
  const SE_SECRET = process.env.SIGHTENGINE_SECRET ?? '';
  if (!SE_USER || !SE_SECRET) {
    console.warn('[Moderation] Skipping — SIGHTENGINE_USER / SIGHTENGINE_SECRET not set');
    return { safe: true };
  }

  try {
    const fd = new FormData();
    fd.append('media',      new Blob([buffer], { type: mimeType }), 'image.jpg');
    fd.append('api_user',   SE_USER);
    fd.append('api_secret', SE_SECRET); // both set above
    fd.append('models', [
      'nudity-2.1',
      'offensive',
      'gore-2.0',
      'weapon',
      'recreational_drug',
      'face-attributes',
      'text-content',
    ].join(','));

    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: fd });
    const data = await res.json();

    if (!res.ok || data.status === 'failure') {
      const apiMsg = data?.error?.message ?? `Moderation API error (HTTP ${res.status})`;
      console.error('[Moderation] API error:', data);
      throw new Error(`Moderation failed: ${apiMsg}`);
    }

    const scores: Record<string, number> = {};
    const violations: string[] = [];

    // ── Nudity ───────────────────────────────────────────────────
    const n = data.nudity;
    if (n) {
      scores.sexual_activity   = n.sexual_activity   ?? 0;
      scores.sexual_display    = n.sexual_display    ?? 0;
      scores.erotica           = n.erotica           ?? 0;
      scores.very_suggestive   = n.very_suggestive   ?? 0;
      scores.suggestive        = n.suggestive        ?? 0;
      scores.mildly_suggestive = n.mildly_suggestive ?? 0;

      if (n.sexual_activity > 0.45 || n.sexual_display > 0.45 || n.erotica > 0.45)
        violations.push('explicit_nudity');
      else if (n.very_suggestive > 0.65)
        violations.push('suggestive_nudity');
    }

    // ── Offensive / hate ─────────────────────────────────────────
    const off = data.offensive;
    if (off) {
      scores.offensive = off.prob ?? 0;
      if (off.prob > 0.6) violations.push('offensive');
    }

    // ── Gore / violence ──────────────────────────────────────────
    const gore = data.gore;
    if (gore) {
      scores.gore = gore.prob ?? 0;
      if (gore.prob > 0.6) violations.push('gore');
    }

    // ── Weapons ──────────────────────────────────────────────────
    const weapon = data.weapon;
    if (weapon) {
      scores.firearm = weapon.classes?.firearm ?? 0;
      if ((weapon.classes?.firearm ?? 0) > 0.8) violations.push('weapon');
    }

    // ── Drugs ────────────────────────────────────────────────────
    const drugs = data.recreational_drug;
    if (drugs) {
      scores.drugs = drugs.prob ?? 0;
      if (drugs.prob > 0.75) violations.push('drugs');
    }

    if (violations.length === 0) return { safe: true, scores };

    const primaryViolation = violations[0];
    const messages: Record<string, { reason: string; details: string }> = {
      explicit_nudity: {
        reason:  '🚫 Explicit nudity or sexual content detected',
        details: 'This image contains explicit sexual content which violates our Community Guidelines. Repeated violations may result in a temporary or permanent upload suspension.',
      },
      suggestive_nudity: {
        reason:  '🚫 Suggestive content detected',
        details: 'This image contains suggestive content that violates our Community Guidelines. Please upload images appropriate for a general audience.',
      },
      offensive: {
        reason:  '🚫 Offensive or hateful imagery detected',
        details: 'This image contains offensive or hate-related content. Our platform does not allow content that targets individuals or groups. Repeated violations may result in suspension.',
      },
      gore: {
        reason:  '🚫 Graphic violence or gore detected',
        details: 'This image contains graphic violent or gory content which violates our Community Guidelines. Please keep content safe for all audiences.',
      },
      weapon: {
        reason:  '🚫 Illegal weapon imagery detected',
        details: 'This image prominently features firearms or illegal weapons in a way that violates our platform policies.',
      },
      drugs: {
        reason:  '🚫 Drug-related content detected',
        details: 'This image appears to contain drug paraphernalia or drug use, which violates our Community Guidelines.',
      },
    };

    const msg = messages[primaryViolation] ?? {
      reason:  '🚫 Content policy violation',
      details: 'This image violates our Community Guidelines. Please review our policies before uploading.',
    };

    return { safe: false, violation: primaryViolation, scores, ...msg };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown moderation error';
    console.error('[Moderation] Unexpected error:', err);
    throw new Error(errMsg);
  }
}

// ── Image processing ─────────────────────────────────────────────
async function processImage(buffer: Buffer): Promise<{ main: Buffer; thumb: Buffer }> {
  const meta   = await sharp(buffer).rotate().metadata();
  const w      = meta.width  ?? MAX_W;
  const h      = meta.height ?? MAX_H;
  const ratio  = Math.min(MAX_W / w, MAX_H / h, 1);
  const thumbH = Math.round((THUMB_W / w) * h);

  const [main, thumb] = await Promise.all([
    sharp(buffer)
      .rotate()
      .resize(Math.round(w * ratio), Math.round(h * ratio), { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(THUMB_W, thumbH, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer(),
  ]);

  return { main, thumb };
}

// ── Blob upload (Vercel Blob) ─────────────────────────────────────
async function blobUpload(
  buffer: Buffer, filename: string, userId: string, folder: string,
): Promise<string> {
  if (!buffer || buffer.length === 0) throw new Error('blobUpload: buffer is empty or undefined');
  if (!filename) throw new Error('blobUpload: filename is empty or undefined');

  const pathname = `${folder}/${userId}/${Date.now()}-${filename}`;
  const { url } = await put(pathname, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });

  return url;
}

// ── Report violation ─────────────────────────────────────────────
async function reportViolation(userId: string, violation: string): Promise<void> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!APP_URL) return;
  try {
    await fetch(`${APP_URL}/api/report-violation`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, reason: violation }),
    });
  } catch { /* non-critical */ }
}

// ── Save to DB ───────────────────────────────────────────────────
async function saveToDatabase(payload: {
  userId: string; title: string; description: string;
  category: string; wallType: string;
  imageUrl: string; thumbnailUrl: string;
}) {
  // Cast to `any` because Supabase's generated types may not include this
  // table — the schema types are not required for the insert to work at runtime.
  const { data, error } = await (getSupabase() as any)
    .from('wallpapers')
    .insert({
      user_id:       payload.userId,
      title:         payload.title.trim(),
      description:   payload.description.trim() || null,
      image_url:     payload.imageUrl,
      thumbnail_url: payload.thumbnailUrl,
      category:      payload.category.trim()    || 'Other',
      type:          payload.wallType           || 'mobile',
      tags:          [],
      is_public:     true,
      views:         0,
      downloads:     0,
    })
    .select()
    .single();

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return data;
}

// ── Main route handler ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file        = form.get('file')        as File   | null;
    const userId      = form.get('userId')      as string | null;
    const title       = form.get('title')       as string | null;
    const description = (form.get('description') as string | null) ?? '';
    const category    = (form.get('category')    as string | null) ?? '';
    const wallType    = (form.get('wallType')    as string | null) ?? 'mobile';

    // ── Validation ───────────────────────────────────────────────
    if (!file || !userId || !title)
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, userId, title' },
        { status: 400 },
      );

    // Guard: form.get('file') can return a string if client sends wrong content-type
    if (typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function')
      return NextResponse.json(
        { success: false, error: 'Invalid file field — must be a File object' },
        { status: 400 },
      );

    if (!file.type.startsWith('image/'))
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 },
      );

    if (file.size > 30 * 1024 * 1024)
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 30MB.' },
        { status: 400 },
      );

    // Guard: arrayBuffer() can return undefined in some Next.js/Node versions
    const arrayBuf = await file.arrayBuffer();
    if (!arrayBuf) throw new Error('Failed to read file: arrayBuffer() returned undefined');
    const buffer = Buffer.from(arrayBuf);
    if (!buffer || buffer.length === 0) throw new Error('Failed to read file: buffer is empty');

    // ── Step 1: Moderation ───────────────────────────────────────
    const mod = await moderateImage(buffer, file.type);
    if (!mod.safe) {
      await reportViolation(userId, mod.violation ?? 'policy');
      return NextResponse.json(
        { success: false, violation: true, error: mod.reason, details: mod.details, scores: mod.scores },
        { status: 422 },
      );
    }

    // ── Step 2: Process image ────────────────────────────────────
    const { main, thumb } = await processImage(buffer);

    // ── Step 3: Upload to blob store ─────────────────────────────
    const [imageUrl, thumbnailUrl] = await Promise.all([
      blobUpload(main,  file.name,            userId, 'wallpapers'),
      blobUpload(thumb, `thumb_${file.name}`, userId, 'wallpapers/thumbnails'),
    ]);

    // ── Step 4: Save to DB ───────────────────────────────────────
    await saveToDatabase({ userId, title, description, category, wallType, imageUrl, thumbnailUrl });

    return NextResponse.json({ success: true, imageUrl, thumbnailUrl });

  } catch (err: any) {
    console.error('[/api/upload] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
