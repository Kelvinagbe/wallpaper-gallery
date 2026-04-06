import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const name = req.nextUrl.searchParams.get('name') || 'wallpaper';

  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Walls-App/1.0' } });
    if (!res.ok) throw new Error('Fetch failed');

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const filename = `${name.replace(/[^a-z0-9_\-\s]/gi, '_')}.jpg`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}