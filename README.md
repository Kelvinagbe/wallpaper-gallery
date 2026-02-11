# Wallpaper Gallery - Refactored Components

This is the refactored version of the Wallpaper Gallery application, split into modular, reusable components.

## 📁 Project Structure

```
.
├── WallpaperGallery.tsx          # Main component (entry point)
├── types.ts                       # TypeScript type definitions
├── utils/
│   └── mockData.ts               # Mock data generation
└── components/
    ├── index.ts                  # Component exports
    ├── GlobalStyles.tsx          # Global CSS animations & styles
    ├── Header.tsx                # Top header with filters
    ├── Navigation.tsx            # Bottom navigation bar
    ├── WallpaperCard.tsx         # Individual wallpaper card
    ├── WallpaperGrid.tsx         # Grid layout for wallpapers
    ├── SearchModal.tsx           # Search modal with trending tags
    ├── UploadModal.tsx           # Upload wallpaper modal
    ├── UserProfile.tsx           # User profile view
    └── WallpaperDetail.tsx       # Detailed wallpaper view
```

## 🧩 Component Breakdown

### Main Components

- **WallpaperGallery.tsx** - Main container managing all state and routing between views
- **GlobalStyles.tsx** - Contains all CSS animations and global styles
- **Header.tsx** - Sticky header with logo and filter buttons
- **Navigation.tsx** - Bottom navigation with Home, Search, Upload, Notifications, Profile

### Content Components

- **WallpaperCard.tsx** - Individual wallpaper card with hover effects, like/download buttons
- **WallpaperGrid.tsx** - Masonry grid layout with loading states and empty state
- **SearchModal.tsx** - Full-screen search with trending tags and popular creators
- **UploadModal.tsx** - Modal for uploading new wallpapers
- **UserProfile.tsx** - User profile with stats, follow button, and user's posts
- **WallpaperDetail.tsx** - Full-screen view with image, stats, actions, related wallpapers
- **ProfileNav.tsx** - Current user's profile page with settings and menu options
- **NotificationNav.tsx** - Notifications feed with different notification types

### Utilities

- **types.ts** - TypeScript interfaces for Wallpaper, UserProfile, etc.
- **mockData.ts** - Generates mock wallpapers and user profiles

## 🚀 Usage

Import and use the main component:

```tsx
import WallpaperGallery from './WallpaperGallery';

function App() {
  return <WallpaperGallery />;
}
```

## 🎨 Features

- **Masonry Grid Layout** - Responsive columns (2-5 based on screen size)
- **Search & Filter** - Search wallpapers by title, tags, or creator
- **User Profiles** - View user stats and follow/unfollow
- **Upload** - Modal interface for uploading new wallpapers
- **Notifications** - Real-time notifications for likes, downloads, follows, and achievements
- **Profile Page** - Comprehensive profile with settings, saved collections, and recent activity
- **Smooth Animations** - Slide-up modals, fade transitions, skeleton loaders
- **Mobile-First** - Bottom navigation optimized for mobile

## 🔧 Key Technologies

- React with TypeScript
- Lucide React icons
- Tailwind CSS utility classes
- CSS animations (no external animation libraries)

## 📝 Notes

- All components are fully typed with TypeScript
- Mock data is generated on mount (1 second delay to simulate loading)
- Console logs are used for button actions (replace with actual logic)
- Images use Lorem Picsum and Pravatar for placeholders

## 🎯 Benefits of This Structure

✅ **Separation of Concerns** - Each component has a single responsibility  
✅ **Reusability** - Components can be reused across the app  
✅ **Maintainability** - Easier to find and fix bugs  
✅ **Scalability** - Easy to add new features  
✅ **Type Safety** - Full TypeScript support  
✅ **Cleaner Code** - Much more readable than the monolithic version
