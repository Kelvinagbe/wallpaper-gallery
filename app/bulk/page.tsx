'use client';

// app/admin/bulk-upload/page.tsx
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Loader, Lock, Eye, EyeOff, RefreshCw, ChevronDown, Image as ImageIcon } from 'lucide-react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
const BLOB_URL       = 'https://ovrica.name.ng/api/blob-upload';
const SAVE_URL       = '/api/save-wallpaper';
const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent';
const CATEGORIES     = ['Nature','Cars','Anime','City','Abstract','Space','Animals','Architecture','Gaming','Minimal','Dark','Gradient','Other'];
const ADMIN_UID      = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';

type Status = 'idle' | 'analyzing' | 'ready' | 'uploading' | 'done' | 'error';
interface ImageItem { id: string; file: File; preview: string; title: string; description: string; category: string; status: Status; error?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload  = () => res((r.result as string).split(',')[1]);
  r.onerror = () => rej(new Error('Failed to read file'));
  r.readAsDataURL(file);
});

const analyzeWithGemini = async (file: File, category: string) => {
  const base64 = await toBase64(file);
  const prompt = `Look at this wallpaper image and respond with ONLY raw JSON, no markdown, no explanation:
{"title":"3-5 word title","description":"one sentence max 100 chars","category":"pick ONE from: ${CATEGORIES.join(', ')}"}
${category !== 'Auto' ? `Prefer category "${category}" if it fits.` : 'Pick the best category.'}`;

  const res = await fetch(`${GEMINI_URL}?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: file.type, data: base64 } }, { text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 300 } }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Gemini ${res.status}: ${e?.error?.message || res.statusText}`); }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[Gemini] Raw response for', file.name, ':', text);
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error(`Bad Gemini response: ${text.slice(0, 80)}`);
  const p = JSON.parse(match[0]);
  if (!p.title || !p.description || !p.category) throw new Error('Incomplete Gemini data');
  return { title: p.title, description: p.description, category: CATEGORIES.includes(p.category) ? p.category : 'Other' };
};

// ─── Shared input style ────────────────────────────────────────────────────────
const darkInput: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [authed,        setAuthed]        = useState(false);
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [authError,     setAuthError]     = useState('');
  const [images,        setImages]        = useState<ImageItem[]>([]);
  const [batchCat,      setBatchCat]      = useState('Auto');
  const [catOpen,       setCatOpen]       = useState(false);
  const [dragging,      setDragging]      = useState(false);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAuth = () => password === ADMIN_PASSWORD ? (setAuthed(true), setAuthError('')) : setAuthError('Wrong password');
  const updateImage = (id: string, patch: Partial<ImageItem>) => setImages(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  const removeImage = (id: string) => setImages(p => p.filter(i => i.id !== id));

  const addFiles = useCallback((files: FileList | File[]) => {
    const items: ImageItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, preview: URL.createObjectURL(f), title: '', description: '', category: batchCat === 'Auto' ? 'Other' : batchCat, status: 'idle' }));
    setImages(p => [...p, ...items]);
  }, [batchCat]);

  const analyzeAll = async () => {
    const todo = images.filter(i => i.status === 'idle');
    if (!todo.length) return;
    setIsAnalyzing(true);
    for (const img of todo) {
      updateImage(img.id, { status: 'analyzing' });
      try {
        const r = await analyzeWithGemini(img.file, batchCat);
        updateImage(img.id, { ...r, status: 'ready' });
      } catch (e: any) {
        console.error('[Gemini] Failed on', img.file.name, ':', e.message);
        updateImage(img.id, { status: 'error', error: e.message, title: img.file.name.replace(/\.[^.]+$/, ''), description: '' });
      }
      await new Promise(r => setTimeout(r, 400));
    }
    setIsAnalyzing(false);
  };

  const uploadAll = async () => {
    const todo = images.filter(i => i.status === 'ready' || (i.status === 'error' && !!i.title));
    if (!todo.length) return;
    setIsUploading(true); setUploadedCount(0);
    let count = 0;
    for (const img of todo) {
      updateImage(img.id, { status: 'uploading' });
      try {
        const fd = new FormData();
        fd.append('file', img.file, img.file.name); fd.append('userId', ADMIN_UID || 'admin'); fd.append('folder', 'wallpapers');
        const blobRes = await fetch(BLOB_URL, { method: 'POST', body: fd, mode: 'cors', credentials: 'omit' });
        if (!blobRes.ok) throw new Error('Blob upload failed');
        const blobData = await blobRes.json();
        console.log('[Blob] Response for', img.file.name, ':', blobData);
        const imageUrl = blobData.imageUrl || blobData.url;
        if (!blobData.success || !imageUrl) throw new Error('No URL returned');
        const dbRes = await fetch(SAVE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: ADMIN_UID || 'admin', title: img.title.trim() || img.file.name, description: img.description.trim() || null, category: img.category || 'Other', image_url: imageUrl, thumbnail_url: imageUrl }) });
        if (!dbRes.ok) throw new Error('DB save failed');
        const db = await dbRes.json();
        if (!db.success) throw new Error(db.error || 'DB save failed');
        updateImage(img.id, { status: 'done' }); count++; setUploadedCount(count);
      } catch (e: any) { console.error('[Upload] Failed on', img.file.name, ':', e.message); updateImage(img.id, { status: 'error', error: e.message }); }
      await new Promise(r => setTimeout(r, 200));
    }
    setIsUploading(false);
  };

  const idleCount      = images.filter(i => i.status === 'idle').length;
  const analyzingCount = images.filter(i => i.status === 'analyzing').length;
  const readyCount     = images.filter(i => i.status === 'ready').length;
  const doneCount      = images.filter(i => i.status === 'done').length;
  const errorCount     = images.filter(i => i.status === 'error' && !!i.title).length;
  const uploadTotal    = readyCount + errorCount;

  // ── Login ──────────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: 340, background: '#111', borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={20} color="rgba(255,255,255,0.5)" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Admin Access</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Bulk Wallpaper Upload</p>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Enter admin password"
            style={{ width: '100%', padding: '11px 40px 11px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${authError ? '#ef4444' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showPass ? <EyeOff size={15} color="rgba(255,255,255,0.3)" /> : <Eye size={15} color="rgba(255,255,255,0.3)" />}
          </button>
        </div>
        {authError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{authError}</p>}
        <button onClick={handleAuth} style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: '#fff', color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Enter</button>
      </div>
    </div>
  );

  // ── Main ───────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Bulk Upload</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{images.length} images · {doneCount} done · {errorCount} errors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {doneCount  > 0 && <button onClick={() => setImages(p => p.filter(i => i.status !== 'done'))}  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear done</button>}
          {images.length > 0 && <button onClick={() => setImages([])} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>}
        </div>
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>

        {/* Drop zone */}
        <div onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          style={{ border: `2px dashed ${dragging ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 16, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color .15s', background: dragging ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={20} color="rgba(255,255,255,0.4)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Drop images here or tap to select</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>PNG · JPG · WEBP · max 10MB each</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />

        {/* Controls */}
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Category picker */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setCatOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span>{batchCat === 'Auto' ? '🤖 Auto category' : `🏷️ ${batchCat}`}</span>
                <ChevronDown size={13} color="rgba(255,255,255,0.4)" style={{ transition: 'transform .2s', transform: catOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {catOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 6, zIndex: 50, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  {['Auto', ...CATEGORIES].map(cat => (
                    <button key={cat} onClick={() => { setBatchCat(cat); setCatOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', background: batchCat === cat ? 'rgba(255,255,255,0.08)' : 'transparent', color: batchCat === cat ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {cat === 'Auto' ? '🤖 Auto (Gemini decides)' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {idleCount > 0 && (
              <button onClick={analyzeAll} disabled={isAnalyzing} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isAnalyzing ? 'default' : 'pointer', opacity: isAnalyzing ? 0.6 : 1, fontFamily: 'inherit' }}>
                {isAnalyzing ? <Loader size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <ImageIcon size={13} />}
                {isAnalyzing ? `Analyzing... (${analyzingCount} left)` : `Analyze ${idleCount} with Gemini`}
              </button>
            )}

            {uploadTotal > 0 && (
              <button onClick={uploadAll} disabled={isUploading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#fff', color: '#0a0a0a', fontSize: 13, fontWeight: 700, cursor: isUploading ? 'default' : 'pointer', opacity: isUploading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {isUploading ? <Loader size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <Upload size={13} />}
                {isUploading ? `Uploading ${uploadedCount}/${uploadTotal}...` : `Upload ${uploadTotal} wallpapers`}
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {images.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {images.map(img => (
              <div key={img.id} style={{ background: '#111', borderRadius: 16, overflow: 'hidden', border: `1px solid ${img.status === 'done' ? 'rgba(16,185,129,0.3)' : img.status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}` }}>

                {/* Thumbnail */}
                <div style={{ position: 'relative', height: 150, background: '#0a0a0a' }}>
                  <img src={img.preview} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: img.status === 'uploading' ? 0.5 : 1 }} />

                  {(img.status === 'analyzing' || img.status === 'uploading') && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Loader size={20} color="#fff" style={{ animation: 'spin .8s linear infinite' }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{img.status === 'analyzing' ? 'Analyzing...' : 'Uploading...'}</span>
                    </div>
                  )}

                  {img.status === 'done' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={18} color="#fff" strokeWidth={2.5} /></div>
                    </div>
                  )}

                  {img.status !== 'uploading' && img.status !== 'done' && (
                    <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={12} color="#fff" />
                    </button>
                  )}

                  {img.category && img.status !== 'idle' && (
                    <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 600, color: '#fff' }}>{img.category}</div>
                  )}
                </div>

               {/* Meta */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {img.status === 'idle' ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '8px 0' }}>Waiting for analysis...</p>
                  ) : img.status === 'error' && !img.title ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Analysis failed</p>
                      </div>
                      <p style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)', lineHeight: 1.4, wordBreak: 'break-all' }}>{img.error || 'Unknown error'}</p>
                      <button onClick={() => updateImage(img.id, { status: 'idle', error: undefined })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
                        <RefreshCw size={10} />Re-analyze
                      </button>
                    </div>
                  ) : (
                    <>
                      <input value={img.title} onChange={e => updateImage(img.id, { title: e.target.value })} placeholder="Title" disabled={img.status === 'uploading' || img.status === 'done'} style={darkInput} />
                      <textarea value={img.description} onChange={e => updateImage(img.id, { description: e.target.value })} placeholder="Description" rows={2} disabled={img.status === 'uploading' || img.status === 'done'} style={{ ...darkInput, fontSize: 11, color: 'rgba(255,255,255,0.7)', resize: 'none' }} />
                      {img.status === 'error' && (
                        <button onClick={() => updateImage(img.id, { status: 'idle', error: undefined })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <RefreshCw size={10} />Re-analyze
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)' }}>
            <ImageIcon size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14 }}>No images added yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Drop images above or click to select</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}