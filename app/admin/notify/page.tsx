'use client'
// app/admin/notify/page.tsx
// Place behind your own auth middleware or protect with NOTIFY_SECRET

import { useState } from 'react'

type Channel = 'walls_trending' | 'walls_promo' | 'walls_downloads'
type NotifType = 'simple' | 'image' | 'grid'

interface Result {
  sent: number
  failed: number
  total: number
  removedInvalid: number
}

export default function NotifyPage() {
  const [secret, setSecret]       = useState('')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [type, setType]           = useState<NotifType>('simple')
  const [imageUrl, setImageUrl]   = useState('')
  const [images, setImages]       = useState('')
  const [total, setTotal]         = useState('')
  const [channel, setChannel]     = useState<Channel>('walls_trending')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<Result | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [preview, setPreview]     = useState(false)

  async function send() {
    setLoading(true); setResult(null); setError(null)
    try {
      const payload: Record<string, string> = { title, body: body, channel }
      if (type === 'image' && imageUrl)  payload.image_url = imageUrl
      if (type === 'grid'  && images)    payload.images    = images
      if (type === 'grid'  && total)     payload.total     = total

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const gridUrls = images.split(',').map(u => u.trim()).filter(Boolean).slice(0, 6)

  return (
    <div style={styles.root}>
      {/* Background grain */}
      <div style={styles.grain} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoMark}>⚡</div>
          <div>
            <h1 style={styles.heading}>Push Notify</h1>
            <p style={styles.subheading}>Walls · FCM Broadcast</p>
          </div>
        </div>

        {/* Secret key */}
        <Field label="Admin Secret">
          <input
            style={styles.input}
            type="password"
            placeholder="NOTIFY_SECRET from Vercel env"
            value={secret}
            onChange={e => setSecret(e.target.value)}
          />
        </Field>

        {/* Channel */}
        <Field label="Channel">
          <div style={styles.pills}>
            {(['walls_trending', 'walls_promo', 'walls_downloads'] as Channel[]).map(c => (
              <button
                key={c}
                style={{ ...styles.pill, ...(channel === c ? styles.pillActive : {}) }}
                onClick={() => setChannel(c)}
              >
                {c === 'walls_trending' ? '🔥 Trending' : c === 'walls_promo' ? '🎁 Promo' : '⬇️ Downloads'}
              </button>
            ))}
          </div>
        </Field>

        {/* Type */}
        <Field label="Notification Type">
          <div style={styles.pills}>
            {(['simple', 'image', 'grid'] as NotifType[]).map(t => (
              <button
                key={t}
                style={{ ...styles.pill, ...(type === t ? styles.pillActive : {}) }}
                onClick={() => setType(t)}
              >
                {t === 'simple' ? '💬 Text only' : t === 'image' ? '🖼️ Big image' : '⬡ 6-grid'}
              </button>
            ))}
          </div>
        </Field>

        {/* Title & Body */}
        <Field label="Title">
          <input
            style={styles.input}
            placeholder="🔥 New Wallpapers!"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Body">
          <textarea
            style={{ ...styles.input, ...styles.textarea }}
            placeholder="Fresh picks are live on Walls."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </Field>

        {/* Image URL (single) */}
        {type === 'image' && (
          <Field label="Image URL">
            <input
              style={styles.input}
              placeholder="https://walls.ovrica.name.ng/img/wallpaper.jpg"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                style={styles.imgPreview}
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
          </Field>
        )}

        {/* Grid images */}
        {type === 'grid' && (
          <>
            <Field label="Image URLs (comma-separated, up to 6)">
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                placeholder="https://…/img1.jpg, https://…/img2.jpg, …"
                value={images}
                onChange={e => setImages(e.target.value)}
              />
            </Field>
            <Field label="Total wallpaper count (optional — shows '+N More')">
              <input
                style={styles.input}
                placeholder="e.g. 24"
                value={total}
                onChange={e => setTotal(e.target.value)}
                type="number"
              />
            </Field>

            {/* Grid preview */}
            {gridUrls.length > 0 && (
              <Field label="Grid Preview">
                <div style={styles.grid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={styles.gridCell}>
                      {gridUrls[i] ? (
                        <img src={gridUrls[i]} alt={`img${i+1}`} style={styles.gridImg}
                          onError={e => { e.currentTarget.style.display='none' }} />
                      ) : (
                        <div style={styles.gridEmpty}>—</div>
                      )}
                      {i === 5 && total && Number(total) > 6 && (
                        <div style={styles.gridOverlay}>+{Number(total) - 5} More</div>
                      )}
                    </div>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {/* Send button */}
        <button
          style={{ ...styles.sendBtn, ...(loading ? styles.sendBtnDisabled : {}) }}
          onClick={send}
          disabled={loading || !title || !body || !secret}
        >
          {loading ? (
            <span style={styles.spinner}>◌</span>
          ) : (
            '⚡ Send Notification'
          )}
        </button>

        {/* Result */}
        {result && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>✅ Sent successfully</div>
            <div style={styles.resultRow}><span>Delivered</span><strong>{result.sent}</strong></div>
            <div style={styles.resultRow}><span>Failed</span><strong>{result.failed}</strong></div>
            <div style={styles.resultRow}><span>Total tokens</span><strong>{result.total}</strong></div>
            {result.removedInvalid > 0 && (
              <div style={styles.resultRow}><span>Cleaned up invalid tokens</span><strong>{result.removedInvalid}</strong></div>
            )}
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldStyles.wrapper}>
      <label style={fieldStyles.label}>{label}</label>
      {children}
    </div>
  )
}

const fieldStyles = {
  wrapper: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', fontFamily: '"DM Mono", monospace' },
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 16px',
    fontFamily: '"DM Sans", -apple-system, sans-serif',
    position: 'relative' as const,
  },
  grain: {
    position: 'fixed' as const,
    inset: 0,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 24,
    position: 'relative' as const,
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.03em',
  },
  subheading: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: '"DM Mono", monospace',
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  textarea: {
    minHeight: 80,
    resize: 'vertical' as const,
  },
  pills: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  pill: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  pillActive: {
    background: 'rgba(108,99,255,0.2)',
    border: '1px solid rgba(108,99,255,0.5)',
    color: '#a89dff',
  },
  imgPreview: {
    width: '100%',
    maxHeight: 180,
    objectFit: 'cover' as const,
    borderRadius: 10,
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gridCell: {
    position: 'relative' as const,
    aspectRatio: '1',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gridImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  gridEmpty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 20,
  },
  gridOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
  },
  sendBtn: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
    border: 'none',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    transition: 'opacity 0.15s',
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  resultBox: {
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  resultTitle: {
    color: '#4ade80',
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 4,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 14,
    padding: '14px 18px',
    color: '#f87171',
    fontSize: 14,
  },
}
