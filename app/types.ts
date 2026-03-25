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
  createdAt?: string;
  category?: string;
  type?: 'mobile' | 'pc';
  uploader?: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    verified?: boolean;
  };
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
  username?: string;
  createdAt?: string;
};

export type Ad = {
  id: string;
  type: 'ad';
  adType: 'native' | 'banner';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl: string;
  brandName: string;
  brandLogoUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
};

export type ActiveTab = 'home' | 'search' | 'notifications' | 'profile';
export type Filter = 'all' | 'trending' | 'recent' | 'popular';