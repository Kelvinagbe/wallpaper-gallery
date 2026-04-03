export const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

export const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://walls.app';
export const APP_NAME = 'WALLS';