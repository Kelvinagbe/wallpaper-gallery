// mockData.ts
import type { Wallpaper, UserProfile } from '../types';

export const generateMockData = () => {
  const titles = ['Stunning', 'Beautiful', 'Epic', 'Majestic'];
  const types = ['Nature', 'Abstract', 'Minimal', 'Dark', 'Anime'];
  const users = ['Alex Chen', 'Sarah Miller', 'Mike Johnson', 'Emma Davis', 'Chris Lee'];

  const profiles: UserProfile[] = users.map((name, i) => ({
    id: `user-${i}`,
    name,
    avatar: `https://i.pravatar.cc/150?img=${i * 10}`,
    bio: `${['Photographer', 'Designer', 'Artist', 'Creator', 'Visual Artist'][i]} | Sharing amazing wallpapers`,
    followers: Math.floor(Math.random() * 10000),
    following: Math.floor(Math.random() * 1000),
    posts: Math.floor(Math.random() * 100) + 10,
    isFollowing: false,
    verified: i === 0 || i === 2 // Make first and third user verified
  }));

  const wallpapers: Wallpaper[] = Array.from({ length: 24 }, (_, i) => {
    const imageId = (i % 80) + 1;
    const userIndex = Math.floor(Math.random() * 5);
    return {
      id: `wp-${i + 1}`,
      url: `https://picsum.photos/id/${imageId}/1080/1920`,
      thumbnail: `https://picsum.photos/id/${imageId}/400/600`,
      title: `${titles[Math.floor(Math.random() * 4)]} ${types[Math.floor(Math.random() * 5)]} Wallpaper`,
      description: `${['4K', 'HD', 'Ultra HD', 'High Quality'][Math.floor(Math.random() * 4)]} wallpaper perfect for your device`,
      tags: Math.random() > 0.5 ? ['nature', 'landscape'] : ['abstract', 'dark'],
      downloads: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 5000),
      views: Math.floor(Math.random() * 50000),
      uploadedBy: users[userIndex],
      userId: `user-${userIndex}`,
      userAvatar: `https://i.pravatar.cc/150?img=${userIndex * 10}`,
      aspectRatio: 1.3 + Math.random() * 0.8,
      verified: userIndex === 0 || userIndex === 2 // Same users verified
    };
  });

  return { wallpapers, profiles };
};