import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const response = await fetch(url);
  if (!response.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });

  const blob = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename="wallpaper.jpg"',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
