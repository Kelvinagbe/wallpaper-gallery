// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const BLOB_URL   = process.env.BLOB_UPLOAD_URL!;
const SE_USER    = process.env.SIGHTENGINE_USER!;
const SE_SECRET  = process.env.SIGHTENGINE_SECRET!;
const MAX_W      = 1920;
const MAX_H      = 1080;
const THUMB_W    = 400;

// ── Types ────────────────────────────────────────────────────────
interface ModerationResult {
  safe:       boolean;
  violation?: string;
  reason?:    string;
  details?:   string;
  scores?:    Record<string, number>;
}

// ── Moderation (server-side, secrets safe) ───────────────────────
async function moderateImage(buffer: Buffer, mimeType: string): Promise<ModerationResult> {
  if (!SE_USER || !SE_SECRET) return { safe: true };

  try {
    const fd = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    fd.append('media',      blob, 'image.jpg');
    fd.append('api_user',   SE_USER);
    fd.append('api_secret', SE_SECRET);
    // Extended model set for better coverage
    fd.append('models', [
      'nudity-2.0',
      'offensive',
      'gore',
      'weapon',
      'drugs',
      'hate-symbols',
      'face-attributes',
      'text-content',
    ].join(','));

    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: fd });
    const data = await res.json();

    if (!res.ok || data.status === 'failure') {
      console.error('[Moderation] API error:', data);
      return { safe: true }; // fail open — don't block upload on API error
    }

    const scores: Record<string, number> = {};
    const violations: string[] = [];

    // ── Nudity ──────────────────────────────────────────────────
    const n = data.nudity;
    if (n) {
      scores.sexual_activity  = n.sexual_activity  ?? 0;
      scores.sexual_display   = n.sexual_display   ?? 0;
      scores.erotica          = n.erotica          ?? 0;
      scores.very_suggestive  = n.very_suggestive  ?? 0;
      scores.suggestive       = n.suggestive       ?? 0;
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
    const drugs = data.drug;
    if (drugs) {
      scores.drugs = drugs.prob ?? 0;
      if (drugs.prob > 0.75) violations.push('drugs');
    }

    // ── Hate symbols ─────────────────────────────────────────────
    const hate = data['hate-symbols'];
    if (hate) {
      const hateScore = hate.prob ?? 0;
      scores.hate_symbols = hateScore;
      if (hateScore > 0.6) violations.push('hate_symbol');
    }

    if (violations.length === 0) return { safe: true, scores };

    // Map violation → user-facing message
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
      hate_symbol: {
        reason:  '🚫 Hate symbol detected',
        details: 'This image contains symbols associated with hate groups or ideologies, which is strictly prohibited on our platform.',
      },
    };

    const msg = messages[primaryViolation] ?? {
      reason:  '🚫 Content policy violation',
      details: 'This image violates our Community Guidelines. Please review our policies before uploading.',
    };

    return { safe: false, violation: primaryViolation, scores, ...msg };

  } catch (err) {
    console.error('[Moderation] Unexpected error:', err);
    return { safe: true }; // fail open
  }
}

// ── Image processing (server-side with sharp) ────────────────────
async function processImage(buffer: Buffer): Promise<{ main: Buffer; thumb: Buffer; mime: string }> {
  const img = sharp(buffer).rotate(); // auto-rotate from EXIF

  const meta = await img.metadata();
  const w    = meta.width  ?? MAX_W;
  const h    = meta.height ?? MAX_H;

  const ratio  = Math.min(MAX_W / w, MAX_H / h, 1);
  const newW   = Math.round(w * ratio);
  const newH   = Math.round(h * ratio);
  const thumbH = Math.round((THUMB_W / w) * h);

  const [main, thumb] = await Promise.all([
    sharp(buffer)
      .rotate()
      .resize(newW, newH, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(THUMB_W, thumbH, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer(),
  ]);

  return { main, thumb, mime: 'image/jpeg' };
}

// ── Blob upload helper ───────────────────────────────────────────
async function blobUpload(
  buffer: Buffer, filename: string, userId: string, folder: string,
): Promise<string> {
  const fd   = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  fd.append('file',   blob, filename);
  fd.append('userId', userId);
  fd.append('folder', folder);

  const res = await fetch(BLOB_URL, { method: 'POST', body: fd });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || 'Blob upload failed');
  }
  const data = await res.json();
  if (!data.success || !data.url) throw new Error('No URL returned from blob store');
  return data.url as string;
}

// ── Report violation ─────────────────────────────────────────────
async function reportViolation(userId: string, violation: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/report-violation`, {
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/save-wallpaper`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:       payload.userId,
      title:         payload.title.trim(),
      description:   payload.description.trim() || null,
      category:      payload.category.trim()    || null,
      type:          payload.wallType,
      image_url:     payload.imageUrl,
      thumbnail_url: payload.thumbnailUrl,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || 'Database save failed');
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Database save failed');
  return data;
}

// ── Main route handler ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file        = form.get('file')        as File   | null;
    const userId      = form.get('userId')      as string | null;
    const title       = form.get('title')       as string | null;
    const description = form.get('description') as string ?? '';
    const category    = form.get('category')    as string ?? '';
    const wallType    = form.get('wallType')    as string ?? 'mobile';

    // ── Validation ───────────────────────────────────────────────
    if (!file || !userId || !title)
      return NextResponse.json({ success: false, error: 'Missing required fields: file, userId, title' }, { status: 400 });

    if (!file.type.startsWith('image/'))
      return NextResponse.json({ success: false, error: 'File must be an image' }, { status: 400 });

    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB
    if (file.size > MAX_SIZE)
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 30MB.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Step 1: Moderation ───────────────────────────────────────
    const mod = await moderateImage(buffer, file.type);
    if (!mod.safe) {
      await reportViolation(userId, mod.violation ?? 'policy');
      return NextResponse.json({
        success:   false,
        violation: true,
        error:     mod.reason,
        details:   mod.details,
        scores:    mod.scores,
      }, { status: 422 });
    }

    // ── Step 2: Process image ────────────────────────────────────
    const { main, thumb } = await processImage(buffer);

    // ── Step 3: Upload both to blob store ────────────────────────
    const [imageUrl, thumbnailUrl] = await Promise.all([
      blobUpload(main,  file.name,           userId, 'wallpapers'),
      blobUpload(thumb, `thumb_${file.name}`, userId, 'wallpapers/thumbnails'),
    ]);

    // ── Step 4: Save to DB ───────────────────────────────────────
    await saveToDatabase({ userId, title, description, category, wallType, imageUrl, thumbnailUrl });

    return NextResponse.json({ success: true, imageUrl, thumbnailUrl });

  } catch (err: any) {
    console.error('[/api/upload] Error:', err);
    return NextResponse.json({ success: false, error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
