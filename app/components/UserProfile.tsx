import { ChevronLeft, UserPlus, UserMinus, Grid } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import type { UserProfile as UserProfileType, Wallpaper } from '../types';

type UserProfileProps = {
  user: UserProfileType;
  wallpapers: Wallpaper[];
  onClose: () => void;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onToggleFollow: (userId: string) => void;
};

export const UserProfile = ({ user, wallpapers, onClose, onWallpaperClick, onToggleFollow }: UserProfileProps) => {
  const userWallpapers = wallpapers.filter(wp => wp.userId === user.id);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      <button
        onClick={onClose}
        className="sticky top-4 left-4 z-10 p-3 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all w-fit"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="max-w-2xl mx-auto w-full p-4 -mt-14">
        <div className="text-center mb-6 pt-16">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-white/20"
          />
          <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
          <p className="text-white/60 mb-4">{user.bio}</p>

          <div className="flex items-center justify-center gap-6 mb-6">
            {[
              { label: 'Posts', count: user.posts },
              { label: 'Followers', count: user.followers },
              { label: 'Following', count: user.following }
            ].map(({ label, count }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold">
                  {count > 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                </p>
                <p className="text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onToggleFollow(user.id)}
            className={`px-8 py-2.5 rounded-full font-semibold transition-all ${
              user.isFollowing
                ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {user.isFollowing ? (
              <span className="flex items-center gap-2">
                <UserMinus className="w-4 h-4" />
                Unfollow
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Follow
              </span>
            )}
          </button>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center gap-4 mb-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-medium">
              <Grid className="w-4 h-4" />
              Posts
            </button>
          </div>

          <div className="masonry">
            {userWallpapers.map((wp) => (
              <div key={wp.id}>
                <WallpaperCard wp={wp} onClick={() => onWallpaperClick(wp)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
