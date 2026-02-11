export type Wallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  description: string;
  tags: string[];
  downloads: number;
  likes: number;
  views: number;
  uploadedBy: string;
  userId: string;
  userAvatar: string;
  aspectRatio: number;
  verified?: boolean;
};

export type UserProfile = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  isFollowing: boolean;
  verified?: boolean;
};

export type ActiveTab = 'home' | 'search' | 'notifications' | 'profile';
export type Filter = 'all' | 'popular' | 'recent';
