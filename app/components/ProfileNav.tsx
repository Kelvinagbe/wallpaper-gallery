import { ChevronLeft, Settings, Share2, Heart, Bookmark, Clock, LogOut, Moon, Bell, Shield, HelpCircle } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import type { Wallpaper } from '../types';

type ProfileNavProps = {
  onClose: () => void;
  wallpapers: Wallpaper[];
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

type MenuItem = {
  icon: typeof Heart;
  label: string;
  count?: number;
  color: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export const ProfileNav = ({ onClose, wallpapers, onWallpaperClick }: ProfileNavProps) => {
  // Mock current user data
  const currentUser = {
    name: 'John Doe',
    username: '@johndoe',
    avatar: 'https://i.pravatar.cc/150?img=60',
    bio: 'Digital Artist & Photographer',
    followers: 12500,
    following: 845,
    posts: wallpapers.filter(wp => wp.userId === 'user-0').length || 24,
  };

  const stats = [
    { label: 'Posts', value: currentUser.posts },
    { label: 'Followers', value: currentUser.followers > 1000 ? `${(currentUser.followers / 1000).toFixed(1)}k` : currentUser.followers },
    { label: 'Following', value: currentUser.following },
  ];

  const menuSections: MenuSection[] = [
    {
      title: 'My Content',
      items: [
        { icon: Heart, label: 'Liked Wallpapers', count: 156, color: 'text-red-400' },
        { icon: Bookmark, label: 'Saved Collections', count: 23, color: 'text-blue-400' },
        { icon: Clock, label: 'Recently Viewed', count: 48, color: 'text-purple-400' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { icon: Settings, label: 'Account Settings', color: 'text-white/80' },
        { icon: Bell, label: 'Notifications', color: 'text-white/80' },
        { icon: Moon, label: 'Display & Appearance', color: 'text-white/80' },
        { icon: Shield, label: 'Privacy & Security', color: 'text-white/80' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', color: 'text-white/80' },
        { icon: Share2, label: 'Share App', color: 'text-white/80' },
      ]
    }
  ];

  const myWallpapers = wallpapers.filter(wp => wp.userId === 'user-0').slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4">
        {/* Profile Header */}
        <div className="text-center mb-8 pt-4">
          <div className="relative inline-block mb-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-28 h-28 rounded-full border-4 border-white/20"
            />
            <button className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg hover:bg-gray-200 transition-all">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-2xl font-bold mb-1">{currentUser.name}</h2>
          <p className="text-white/60 mb-2">{currentUser.username}</p>
          <p className="text-sm text-white/70 mb-6 max-w-xs mx-auto">{currentUser.bio}</p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button className="flex-1 max-w-[200px] px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all">
              Edit Profile
            </button>
            <button className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-all border border-white/20">
              Share
            </button>
          </div>
        </div>

        {/* My Recent Posts */}
        {myWallpapers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">My Recent Posts</h3>
              <button className="text-sm text-white/60 hover:text-white transition-colors">
                View All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {myWallpapers.map((wp) => (
                <div
                  key={wp.id}
                  onClick={() => onWallpaperClick(wp)}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img src={wp.thumbnail} alt={wp.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Sections */}
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white/60 mb-3 px-2">{section.title.toUpperCase()}</h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                  >
                    <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{item.label}</p>
                    </div>
                    {item.count && (
                      <span className="text-sm text-white/60 font-medium">{item.count}</span>
                    )}
                    <ChevronLeft className="w-5 h-5 rotate-180 text-white/40 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button className="w-full flex items-center justify-center gap-3 p-4 mt-8 mb-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20">
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-red-400">Log Out</span>
        </button>

        {/* Version Info */}
        <div className="text-center text-xs text-white/40 py-6">
          <p>Gallery App v1.0.0</p>
          <p className="mt-1">Made with ❤️ for wallpaper lovers</p>
        </div>
      </div>
    </div>
  );
};