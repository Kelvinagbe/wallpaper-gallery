import { X, Camera, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getProfile, updateProfile, type UserProfile } from '../../utils/userStore';

type SettingsModalProps = {
  onClose: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
};

export const SettingsModal = ({ onClose, onProfileUpdate }: SettingsModalProps) => {
  const [profile, setProfile] = useState(getProfile());
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  
  const saveName = () => {
    if (!tempName.trim()) return;
    const updated = updateProfile({ name: tempName.trim() });
    setProfile(updated);
    onProfileUpdate?.(updated);
    setEditingName(false);
    flash();
  };

  const saveBio = () => {
    const updated = updateProfile({ bio: tempBio.trim() });
    setProfile(updated);
    onProfileUpdate?.(updated);
    setEditingBio(false);
    flash();
  };

  const changeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const updated = updateProfile({ avatar: ev.target?.result as string });
      setProfile(updated);
      onProfileUpdate?.(updated);
      flash();
    };
    reader.readAsDataURL(file);
  };

  return createPortal(
    <>
      <style>{`
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .slide-up{animation:slideUp .3s cubic-bezier(.34,1.56,.64,1)}
        .fade-in{animation:fadeIn .2s ease-out}
      `}</style>

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end fade-in" onClick={onClose}>
        <div className="bg-gradient-to-b from-zinc-900 to-black w-full max-h-[50vh] rounded-t-3xl overflow-hidden flex flex-col shadow-2xl slide-up" onClick={e=>e.stopPropagation()}>
          
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Edit Profile</h2>
            <div className="flex items-center gap-2">
              {saved&&<div className="flex items-center gap-1.5 text-green-400 text-sm animate-pulse"><CheckCircle className="w-4 h-4"/><span>Saved</span></div>}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95"><X className="w-5 h-5"/></button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <div className="bg-white/5 rounded-xl border border-white/5 p-4 space-y-4">
              
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/20 transition-transform group-hover:scale-105"/>
                  <button onClick={()=>fileRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-full transition-all active:scale-95 shadow-lg"><Camera className="w-3 h-3"/></button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={changeAvatar}/>
                </div>
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-white/50">{profile.username}</p>
                  <button onClick={()=>fileRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1">Change photo</button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Display Name</label>
                {editingName?<div className="flex gap-2"><input value={tempName} onChange={e=>setTempName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape')setEditingName(false);}} autoFocus className="flex-1 bg-white/10 border border-blue-500/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"/><button onClick={saveName} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-all active:scale-95">Save</button><button onClick={()=>{setEditingName(false);setTempName(profile.name);}} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all active:scale-95">Cancel</button></div>:<button onClick={()=>setEditingName(true)} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 transition-all active:scale-[0.98] group"><span className="text-sm">{profile.name}</span><span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">Edit</span></button>}
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Bio</label>
                {editingBio?<div className="space-y-2"><textarea value={tempBio} onChange={e=>setTempBio(e.target.value)} autoFocus rows={3} maxLength={150} className="w-full bg-white/10 border border-blue-500/50 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-blue-500 transition-colors"/><div className="flex items-center justify-between"><span className="text-xs text-white/40">{tempBio.length}/150</span><div className="flex gap-2"><button onClick={()=>{setEditingBio(false);setTempBio(profile.bio);}} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all active:scale-95">Cancel</button><button onClick={saveBio} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-all active:scale-95">Save</button></div></div></div>:<button onClick={()=>setEditingBio(true)} className="w-full flex items-start justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 transition-all active:scale-[0.98] group"><span className="text-sm text-left text-white/80">{profile.bio||'Add a bio…'}</span><span className="text-xs text-blue-400 group-hover:text-blue-300 ml-2 shrink-0 transition-colors">Edit</span></button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};