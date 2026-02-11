import { X, Bell, Volume2, Download, Camera, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { getSettings, updateSettings, getProfile, updateProfile, type UserSettings, type UserProfile } from '../../utils/userStore';

type SettingsModalProps = {
  onClose: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
};

export const SettingsModal = ({ onClose, onProfileUpdate }: SettingsModalProps) => {
  const [settings, setSettings] = useState(getSettings());
  const [profile, setProfile] = useState(getProfile());
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isMobile = window.innerWidth < 640;

  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 350); };
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  
  const saveName = () => {
    if (!tempName.trim()) return;
    setProfile(updateProfile({ name: tempName.trim() }));
    onProfileUpdate?.(updateProfile({ name: tempName.trim() }));
    setEditingName(false);
    flash();
  };

  const saveBio = () => {
    setProfile(updateProfile({ bio: tempBio.trim() }));
    onProfileUpdate?.(updateProfile({ bio: tempBio.trim() }));
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

  return (
    <>
      <style>{`
        @keyframes su{0%{transform:translateY(100%);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes sd{0%{transform:translateY(0);opacity:1}100%{transform:translateY(100%);opacity:0}}
        @keyframes si{0%{transform:scale(.9)translateY(20px);opacity:0}100%{transform:scale(1)translateY(0);opacity:1}}
        @keyframes so{0%{transform:scale(1);opacity:1}100%{transform:scale(.9)translateY(20px);opacity:0}}
        @keyframes fi{0%{opacity:0}100%{opacity:1}}
        @keyframes fo{0%{opacity:1}100%{opacity:0}}
        @keyframes bounce{0%{transform:scale(0)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
        @media(min-width:640px){.m{animation:${isClosing?'so':'si'} .35s cubic-bezier(.34,1.56,.64,1)}}
        @media(max-width:639px){.m{animation:${isClosing?'sd':'su'} .35s cubic-bezier(.34,1.56,.64,1)}}
      `}</style>

      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:isMobile?'flex-end':'center',justifyContent:'center',padding:isMobile?0:'1rem',animation:`${isClosing?'fo':'fi'} .3s`}} onClick={handleClose}>
        <div className="m" style={{background:'linear-gradient(to bottom,rgb(24,24,27),rgb(0,0,0))',width:'100%',maxWidth:isMobile?'100%':'32rem',borderRadius:isMobile?0:'1rem',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 50px -12px rgba(0,0,0,.5)'}} onClick={e=>e.stopPropagation()}>
          
          {/* Header */}
          <div style={{position:'sticky',top:0,background:'rgba(24,24,27,.95)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,.1)',padding:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:10}}>
            <h2 style={{fontSize:'1.25rem',fontWeight:'bold',margin:0}}>Settings</h2>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
              {saved&&<div style={{display:'flex',alignItems:'center',gap:'.375rem',color:'rgb(74,222,128)',fontSize:'.875rem',animation:'bounce .4s cubic-bezier(.34,1.56,.64,1)'}}><CheckCircle style={{width:'1rem',height:'1rem'}}/><span>Saved</span></div>}
              <button onClick={handleClose} style={{padding:'.5rem',background:'transparent',border:'none',borderRadius:'9999px',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><X style={{width:'1.25rem',height:'1.25rem'}}/></button>
            </div>
          </div>

          <div style={{overflowY:'auto',flex:1,padding:'1rem'}}>
            
            {/* Profile */}
            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.875rem',fontWeight:600,color:'rgba(255,255,255,.6)',marginBottom:'.75rem'}}>PROFILE</h3>
              <div style={{background:'rgba(255,255,255,.05)',borderRadius:'.75rem',border:'1px solid rgba(255,255,255,.05)',padding:'1rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
                  <div style={{position:'relative'}}>
                    <img src={profile.avatar} alt={profile.name} style={{width:'4rem',height:'4rem',borderRadius:'9999px',objectFit:'cover',border:'2px solid rgba(255,255,255,.2)',transition:'transform .2s'}} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}/>
                    <button onClick={()=>fileRef.current?.click()} style={{position:'absolute',bottom:0,right:0,padding:'.375rem',background:'rgb(59,130,246)',border:'none',borderRadius:'9999px',boxShadow:'0 10px 15px -3px rgba(0,0,0,.3)',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><Camera style={{width:'.75rem',height:'.75rem'}}/></button>
                    <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={changeAvatar}/>
                  </div>
                  <div>
                    <p style={{fontWeight:600,margin:0}}>{profile.name}</p>
                    <p style={{fontSize:'.875rem',color:'rgba(255,255,255,.5)',margin:'.25rem 0'}}>{profile.username}</p>
                    <button onClick={()=>fileRef.current?.click()} style={{fontSize:'.75rem',color:'rgb(96,165,250)',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:'.25rem'}}>Change photo</button>
                  </div>
                </div>

                {/* Name */}
                <div style={{marginTop:'1rem'}}>
                  <label style={{fontSize:'.75rem',color:'rgba(255,255,255,.6)',marginBottom:'.375rem',display:'block'}}>Display Name</label>
                  {editingName?<div style={{display:'flex',gap:'.5rem'}}><input value={tempName} onChange={e=>setTempName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape')setEditingName(false);}} autoFocus style={{flex:1,background:'rgba(255,255,255,.1)',border:'1px solid rgba(59,130,246,.5)',borderRadius:'.5rem',padding:'.5rem .75rem',fontSize:'.875rem',outline:'none',color:'white'}}/><button onClick={saveName} style={{padding:'.5rem .75rem',background:'rgb(59,130,246)',border:'none',borderRadius:'.5rem',fontSize:'.875rem',fontWeight:500,color:'white',cursor:'pointer',transition:'all .2s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>Save</button><button onClick={()=>{setEditingName(false);setTempName(profile.name);}} style={{padding:'.5rem .75rem',background:'rgba(255,255,255,.1)',border:'none',borderRadius:'.5rem',fontSize:'.875rem',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>Cancel</button></div>:<button onClick={()=>setEditingName(true)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'.5rem',padding:'.625rem .75rem',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'} onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><span style={{fontSize:'.875rem'}}>{profile.name}</span><span style={{fontSize:'.75rem',color:'rgb(96,165,250)'}}>Edit</span></button>}
                </div>

                {/* Bio */}
                <div style={{marginTop:'1rem'}}>
                  <label style={{fontSize:'.75rem',color:'rgba(255,255,255,.6)',marginBottom:'.375rem',display:'block'}}>Bio</label>
                  {editingBio?<div><textarea value={tempBio} onChange={e=>setTempBio(e.target.value)} autoFocus rows={3} maxLength={150} style={{width:'100%',background:'rgba(255,255,255,.1)',border:'1px solid rgba(59,130,246,.5)',borderRadius:'.5rem',padding:'.5rem .75rem',fontSize:'.875rem',outline:'none',resize:'none',color:'white'}}/><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'.5rem'}}><span style={{fontSize:'.75rem',color:'rgba(255,255,255,.4)'}}>{tempBio.length}/150</span><div style={{display:'flex',gap:'.5rem'}}><button onClick={()=>{setEditingBio(false);setTempBio(profile.bio);}} style={{padding:'.375rem .75rem',background:'rgba(255,255,255,.1)',border:'none',borderRadius:'.5rem',fontSize:'.875rem',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>Cancel</button><button onClick={saveBio} style={{padding:'.375rem .75rem',background:'rgb(59,130,246)',border:'none',borderRadius:'.5rem',fontSize:'.875rem',fontWeight:500,color:'white',cursor:'pointer',transition:'all .2s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>Save</button></div></div></div>:<button onClick={()=>setEditingBio(true)} style={{width:'100%',display:'flex',alignItems:'flex-start',justifyContent:'space-between',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'.5rem',padding:'.625rem .75rem',color:'white',cursor:'pointer',transition:'all .2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'} onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><span style={{fontSize:'.875rem',textAlign:'left',color:'rgba(255,255,255,.8)'}}>{profile.bio||'Add a bio…'}</span><span style={{fontSize:'.75rem',color:'rgb(96,165,250)',marginLeft:'.5rem',flexShrink:0}}>Edit</span></button>}
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.875rem',fontWeight:600,color:'rgba(255,255,255,.6)',marginBottom:'.75rem'}}>NOTIFICATIONS & SOUNDS</h3>
              <div style={{background:'rgba(255,255,255,.05)',borderRadius:'.75rem',border:'1px solid rgba(255,255,255,.05)',overflow:'hidden'}}>
                <T icon={Bell} label="Push Notifications" sub="Get notified about new content" value={settings.notifications} onToggle={()=>setSettings(updateSettings({notifications:!settings.notifications}))}/>
                <div style={{borderTop:'1px solid rgba(255,255,255,.05)'}}/>
                <T icon={Volume2} label="Sound Effects" sub="Play sounds for actions" value={settings.soundEffects} onToggle={()=>setSettings(updateSettings({soundEffects:!settings.soundEffects}))}/>
              </div>
            </div>

            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.875rem',fontWeight:600,color:'rgba(255,255,255,.6)',marginBottom:'.75rem'}}>DOWNLOADS</h3>
              <div style={{background:'rgba(255,255,255,.05)',borderRadius:'.75rem',border:'1px solid rgba(255,255,255,.05)',overflow:'hidden'}}>
                <T icon={Download} label="Auto-save to Gallery" sub="Save downloads automatically" value={settings.autoDownload} onToggle={()=>setSettings(updateSettings({autoDownload:!settings.autoDownload}))}/>
              </div>
            </div>

            <div style={{height:isMobile?'1rem':0}}/>
          </div>
        </div>
      </div>
    </>
  );
};

const T=({icon:I,label,sub,value,onToggle}:any)=>(
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem',transition:'background .2s'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
    <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}><I style={{width:'1.25rem',height:'1.25rem',color:'rgba(255,255,255,.6)'}}/><div><p style={{fontWeight:500,margin:0}}>{label}</p><p style={{fontSize:'.75rem',color:'rgba(255,255,255,.6)',margin:0}}>{sub}</p></div></div>
    <button onClick={onToggle} style={{position:'relative',width:'3rem',height:'1.75rem',borderRadius:'9999px',background:value?'rgb(59,130,246)':'rgba(255,255,255,.2)',border:'none',boxShadow:value?'0 10px 15px -3px rgba(59,130,246,.3)':'none',cursor:'pointer',transition:'all .3s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><div style={{position:'absolute',top:'.25rem',width:'1.25rem',height:'1.25rem',background:'white',borderRadius:'9999px',boxShadow:'0 4px 6px -1px rgba(0,0,0,.2)',transform:value?'translateX(1.5rem)':'translateX(.25rem)',transition:'transform .3s cubic-bezier(.34,1.56,.64,1)'}}/></button>
  </div>
);