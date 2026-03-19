import { useState } from 'react';
import { X, Grid, Download, Eye, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper } from '../../types';

const fmt = (n: number) => n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);

type Props = {
  onClose:           () => void;
  wallpapers:        Wallpaper[];
  onWallpaperClick:  (wp: Wallpaper) => void;
  userName:          string;
};

export const ViewAllPostsModal = ({ onClose, wallpapers, onWallpaperClick, userName }: Props) => {
  const [items,      setItems]      = useState<Wallpaper[]>(wallpapers);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [confirmId,  setConfirmId]  = useState<string | null>(null);
  const supabase = createClient();

  const handleDelete = async (wp: Wallpaper) => {
    setDeleting(wp.id);
    try {
      const { error } = await supabase.from('wallpapers').delete().eq('id', wp.id);
      if (!error) setItems(p => p.filter(i => i.id !== wp.id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); setConfirmId(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 600, borderRadius: '24px 24px 0 0', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={16} color="rgba(0,0,0,0.5)" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>My Posts</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{items.length} wallpapers</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="rgba(0,0,0,0.5)" />
          </button>
        </div>

        {/* Handle */}
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />

        {/* Grid */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Grid size={22} color="rgba(0,0,0,0.18)" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', margin: '0 0 4px' }}>No posts yet</p>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0 }}>Wallpapers you upload will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
              {items.map(wp => (
                <div key={wp.id} style={{ position: 'relative', aspectRatio: '3/4', background: '#e8e8e8', overflow: 'hidden' }}>
                  {/* Image */}
                  <button onClick={() => onWallpaperClick(wp)} style={{ position: 'absolute', inset: 0, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent', display: 'block', width: '100%', height: '100%' }}>
                    <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>

                  {/* Bottom overlay — stats */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)', padding: '20px 6px 6px', pointerEvents: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                        <Eye size={9} color="rgba(255,255,255,0.8)" />{fmt(wp.views)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                        <Download size={9} color="rgba(255,255,255,0.8)" />{fmt(wp.downloads)}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(wp.id); }}
                    style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={11} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setConfirmId(null)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, maxWidth: 300, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} color="#ef4444" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>Delete Wallpaper?</p>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '0 0 22px', lineHeight: 1.5 }}>This will permanently remove the wallpaper. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmId(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button
                onClick={() => { const wp = items.find(i => i.id === confirmId); if (wp) handleDelete(wp); }}
                disabled={!!deleting}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 600, color: '#fff', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
