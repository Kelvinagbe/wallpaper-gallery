'use client';

// app/admin/bulk-upload/page.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Check, AlertCircle, Loader, Lock, Eye, EyeOff, RefreshCw, ChevronDown, Image as ImageIcon, Save } from 'lucide-react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
const BLOB_URL       = 'https://ovrica.name.ng/api/blob-upload';
const SAVE_URL       = '/api/save-wallpaper';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL     = 'meta-llama/llama-4-scout-17b-16e-instruct';
const CATEGORIES     = ['Nature','Cars','Anime','City','Abstract','Space','Animals','Architecture','Gaming','Minimal','Dark','Gradient','Other'];
const ADMIN_UID      = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';
const KEY_STORAGE    = 'groq_api_key';

type Status = 'idle' | 'analyzing' | 'ready' | 'uploading' | 'done' | 'error';
interface ImageItem { id: string; file: File; preview: string; title: string; description: string; category: string; status: Status; error?: string }

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  input:   { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
  cardIn:  { width: '100%', padding: '6px 9px',  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,  fontSize: 12, color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
  ghost:   { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
};

// ─── Groq ─────────────────────────────────────────────────────────────────────
const analyzeWithGroq = async (preview: string, category: string, apiKey: string) => {
  const prompt = `Return ONLY raw JSON no markdown: {"title":"3-5 word title","description":"one sentence max 100 chars","category":"ONE of: ${CATEGORIES.join(', ')}"}${category !== 'Auto' ? ` Prefer "${category}" if it fits.` : ''}`;
  const res  = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: GROQ_MODEL, max_tokens: 200, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: preview } }, { type: 'text', text: prompt }] }] }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Groq ${res.status}`);
  const match = (data.choices?.[0]?.message?.content || '').match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No JSON in response');
  const p = JSON.parse(match[0]);
  return { title: p.title || '', description: p.description || '', category: CATEGORIES.includes(p.category) ? p.category : 'Other' };
};

// ─── Compression ─────────────────────────────────────────────────────────────
const MAX_W = 1920, MAX_H = 1080, THUMB_W = 400;

const targetKB = (size: number) =>
  size < 500 * 1024 ? 150 : size < 2 * 1024 * 1024 ? 180 : 200;

const startQuality = (size: number) =>
  size < 500 * 1024 ? 0.85 : size < 2 * 1024 * 1024 ? 0.80 : size < 5 * 1024 * 1024 ? 0.75 : 0.65;

const toBlob = (img: HTMLImageElement, w: number, h: number, q: number): Promise<Blob> =>
  new Promise((res, rej) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', q);
  });

const loadImg = (url: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

const compressImage = async (file: File): Promise<{ main: Blob; thumb: Blob }> => {
  const url  = URL.createObjectURL(file);
  try {
    const img   = await loadImg(url);
    const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
    const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
    const target = targetKB(file.size) * 1024;
    let q = startQuality(file.size);
    let main = await toBlob(img, w, h, q);
    while (main.size > target && q > 0.5) { q = Math.max(q - 0.08, 0.5); main = await toBlob(img, w, h, q); }
    const th = Math.round((THUMB_W / img.width) * img.height);
    const thumb = await toBlob(img, THUMB_W, th, 0.75);
    return { main, thumb };
  } finally { URL.revokeObjectURL(url); }
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [authed,        setAuthed]        = useState(false);
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [authError,     setAuthError]     = useState('');
  const [groqKey,       setGroqKey]       = useState('');
  const [keySaved,      setKeySaved]      = useState(false);
  const [images,        setImages]        = useState<ImageItem[]>([]);
  const [batchCat,      setBatchCat]      = useState('Auto');
  const [catOpen,       setCatOpen]       = useState(false);
  const [dragging,      setDragging]      = useState(false);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [logs,          setLogs]          = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // load saved key on mount
  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) { setGroqKey(saved); setKeySaved(true); }
  }, []);

  const saveKey = () => { localStorage.setItem(KEY_STORAGE, groqKey); setKeySaved(true); };
  const clearKey = () => { localStorage.removeItem(KEY_STORAGE); setGroqKey(''); setKeySaved(false); };

  const handleAuth   = () => password === ADMIN_PASSWORD ? (setAuthed(true), setAuthError('')) : setAuthError('Wrong password');
  const addLog       = (msg: string) => setLogs(p => [...p, msg]);
  const updateImage  = (id: string, patch: Partial<ImageItem>) => setImages(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  const removeImage  = (id: string) => setImages(p => p.filter(i => i.id !== id));

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    const results: ImageItem[] = [];
    let loaded = 0;
    valid.forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        results.push({ id: Math.random().toString(36).slice(2), file: f, preview: e.target!.result as string, title: '', description: '', category: batchCat === 'Auto' ? 'Other' : batchCat, status: 'idle' });
        if (++loaded === valid.length) setImages(p => [...p, ...results]);
      };
      r.readAsDataURL(f);
    });
  }, [batchCat]);

  const analyzeAll = async () => {
    if (!groqKey) { alert('Enter your Groq API key first'); return; }
    const todo = images.filter(i => i.status === 'idle');
    if (!todo.length) return;
    setIsAnalyzing(true);
    for (const img of todo) {
      updateImage(img.id, { status: 'analyzing' });
      try {
        const r = await analyzeWithGroq(img.preview, batchCat, groqKey);
        addLog(`✅ ${img.file.name} → ${r.title}`);
        updateImage(img.id, { ...r, status: 'ready' });
      } catch (e: any) {
        addLog(`❌ ${img.file.name} → ${e.message}`);
        updateImage(img.id, { status: 'error', error: e.message, title: img.file.name.replace(/\.[^.]+$/, '') });
      }
      await new Promise(r => setTimeout(r, 500));
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
        // Compress main + generate thumbnail
        addLog(`⚙️ Compressing ${img.file.name} (${(img.file.size/1024).toFixed(0)}KB)...`);
        const { main, thumb } = await compressImage(img.file);
        addLog(`✅ ${img.file.name} → main:${(main.size/1024).toFixed(0)}KB thumb:${(thumb.size/1024).toFixed(0)}KB`);

        // Upload main image
        const fd1 = new FormData();
        fd1.append('file', main, img.file.name); fd1.append('userId', ADMIN_UID || 'admin'); fd1.append('folder', 'wallpapers');
        const blobMain = await (await fetch(BLOB_URL, { method: 'POST', body: fd1, mode: 'cors', credentials: 'omit' })).json();
        const imageUrl = blobMain.imageUrl || blobMain.url;
        if (!blobMain.success || !imageUrl) throw new Error('Main upload failed: ' + JSON.stringify(blobMain));

        // Upload thumbnail
        const fd2 = new FormData();
        fd2.append('file', thumb, `thumb_${img.file.name}`); fd2.append('userId', ADMIN_UID || 'admin'); fd2.append('folder', 'wallpapers/thumbnails');
        const blobThumb = await (await fetch(BLOB_URL, { method: 'POST', body: fd2, mode: 'cors', credentials: 'omit' })).json();
        const thumbUrl  = (blobThumb.success && (blobThumb.imageUrl || blobThumb.url)) || imageUrl;

        // Save to DB
        const db = await (await fetch(SAVE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: ADMIN_UID || 'admin', title: img.title || img.file.name, description: img.description || null, category: img.category || 'Other', image_url: imageUrl, thumbnail_url: thumbUrl }) })).json();
        addLog(`${img.file.name} → ${db.success ? '✅ saved' : '❌ ' + db.error}`);
        if (!db.success) throw new Error(db.error || 'DB failed');
        updateImage(img.id, { status: 'done' }); count++; setUploadedCount(count);
      } catch (e: any) {
        addLog(`❌ ${img.file.name}: ${e.message}`);
        updateImage(img.id, { status: 'error', error: e.message });
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setIsUploading(false);
  };

  const idleCount      = images.filter(i => i.status === 'idle').length;
  const readyCount     = images.filter(i => i.status === 'ready').length;
  const doneCount      = images.filter(i => i.status === 'done').length;
  const errorCount     = images.filter(i => i.status === 'error' && !!i.title).length;
  const analyzingCount = images.filter(i => i.status === 'analyzing').length;
  const uploadTotal    = readyCount + errorCount;

  // ── Login ─────────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 340, background: '#111', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Lock size={18} color="rgba(255,255,255,0.4)" />
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Admin</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Bulk Wallpaper Upload</p>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Password"
            style={{ ...S.input, paddingRight: 40, border: `1px solid ${authError ? '#ef4444' : 'rgba(255,255,255,0.08)'}` }} />
          <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            {showPass ? <EyeOff size={14} color="rgba(255,255,255,0.3)" /> : <Eye size={14} color="rgba(255,255,255,0.3)" />}
          </button>
        </div>
        {authError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{authError}</p>}
        <button onClick={handleAuth} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: '#fff', color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Enter</button>
      </div>
    </div>
  );

  // ── Main ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>Bulk Upload</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{images.length} images · {doneCount} done · {errorCount} errors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {doneCount  > 0 && <button onClick={() => setImages(p => p.filter(i => i.status !== 'done'))} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear done</button>}
          {images.length > 0 && <button onClick={() => setImages([])} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>}
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 960, margin: '0 auto' }}>

        {/* Groq key */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input type="password" value={groqKey} onChange={e => { setGroqKey(e.target.value); setKeySaved(false); }} placeholder="Groq API key (gsk_...)" style={{ ...S.input, paddingRight: keySaved ? 90 : 12 }} />
            {keySaved && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#10b981', fontWeight: 600 }}>● Saved</span>}
          </div>
          <button onClick={saveKey} disabled={!groqKey} title="Save key to browser" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 12, cursor: groqKey ? 'pointer' : 'default', opacity: groqKey ? 1 : 0.4, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <Save size={12} />Save
          </button>
          {keySaved && <button onClick={clearKey} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>}
        </div>

        {/* Drop zone */}
        <div onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          style={{ border: `2px dashed ${dragging ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all .15s', background: dragging ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
          <Upload size={16} color="rgba(255,255,255,0.3)" />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Tap to select or drop images · PNG · JPG · WEBP · max 10MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />

        {/* Controls */}
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Category */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setCatOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {batchCat === 'Auto' ? '🤖 Auto' : `🏷️ ${batchCat}`}
                <ChevronDown size={12} color="rgba(255,255,255,0.4)" style={{ transition: 'transform .2s', transform: catOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {catOpen && (
                <div style={{ position: 'absolute', top: '110%', left: 0, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 5, zIndex: 50, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {['Auto', ...CATEGORIES].map(cat => (
                    <button key={cat} onClick={() => { setBatchCat(cat); setCatOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7, border: 'none', background: batchCat === cat ? 'rgba(255,255,255,0.07)' : 'transparent', color: batchCat === cat ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {cat === 'Auto' ? '🤖 Auto (Groq picks)' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {idleCount > 0 && (
              <button onClick={analyzeAll} disabled={isAnalyzing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isAnalyzing ? 'default' : 'pointer', opacity: isAnalyzing ? 0.6 : 1, fontFamily: 'inherit' }}>
                {isAnalyzing ? <Loader size={12} style={{ animation: 'spin .8s linear infinite' }} /> : <ImageIcon size={12} />}
                {isAnalyzing ? `Analyzing ${analyzingCount}...` : `Analyze ${idleCount}`}
              </button>
            )}

            {uploadTotal > 0 && (
              <button onClick={uploadAll} disabled={isUploading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: '#fff', color: '#0a0a0a', fontSize: 12, fontWeight: 700, cursor: isUploading ? 'default' : 'pointer', opacity: isUploading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {isUploading ? <Loader size={12} style={{ animation: 'spin .8s linear infinite' }} /> : <Upload size={12} />}
                {isUploading ? `${uploadedCount}/${uploadTotal} uploading...` : `Upload ${uploadTotal}`}
              </button>
            )}
          </div>
        )}

           {/* Grid */}
        {images.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {images.map(img => (
              <div key={img.id} style={{ background: '#111', borderRadius: 14, overflow: 'hidden', border: `1px solid ${img.status === 'done' ? 'rgba(16,185,129,0.25)' : img.status === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)'}` }}>

                {/* Thumb */}
                <div style={{ position: 'relative', height: 110 }}>
                  <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: img.status === 'uploading' ? 0.5 : 1 }} />
                  {(img.status === 'analyzing' || img.status === 'uploading') && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Loader size={16} color="#fff" style={{ animation: 'spin .8s linear infinite' }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{img.status === 'analyzing' ? 'Analyzing...' : 'Uploading...'}</span>
                    </div>
                  )}
                  {img.status === 'done' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color="#fff" strokeWidth={2.5} /></div>
                    </div>
                  )}
                  {img.status !== 'uploading' && img.status !== 'done' && (
                    <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={9} color="#fff" />
                    </button>
                  )}
                  {img.category && img.status !== 'idle' && (
                    <div style={{ position: 'absolute', bottom: 5, left: 5, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.65)', fontSize: 9, fontWeight: 700, color: '#fff' }}>{img.category}</div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {img.status === 'idle' ? (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '5px 0' }}>Waiting...</p>
                  ) : img.status === 'error' && !img.title ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} color="#ef4444" /><span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Failed</span></div>
                      <p style={{ fontSize: 10, color: 'rgba(239,68,68,0.65)', lineHeight: 1.4, wordBreak: 'break-all' }}>{img.error}</p>
                      <button onClick={() => updateImage(img.id, { status: 'idle', error: undefined })} style={S.ghost}><RefreshCw size={9} />Retry</button>
                    </>
                  ) : (
                    <>
                      <input value={img.title} onChange={e => updateImage(img.id, { title: e.target.value })} placeholder="Title" disabled={img.status === 'uploading' || img.status === 'done'} style={S.cardIn} />
                      <textarea value={img.description} onChange={e => updateImage(img.id, { description: e.target.value })} placeholder="Description" rows={2} disabled={img.status === 'uploading' || img.status === 'done'} style={{ ...S.cardIn, fontSize: 11, color: 'rgba(255,255,255,0.6)', resize: 'none' }} />
                      {img.status === 'error' && <button onClick={() => updateImage(img.id, { status: 'idle', error: undefined })} style={S.ghost}><RefreshCw size={9} />Retry</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.15)' }}>
            <ImageIcon size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13 }}>No images yet</p>
          </div>
        )}

        {/* Log */}
        {logs.length > 0 && (
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, maxHeight: 160, overflowY: 'auto' }}>
            {logs.map((l, i) => <p key={i} style={{ fontSize: 10, color: '#4ade80', fontFamily: 'monospace', lineHeight: 1.7 }}>{l}</p>)}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}