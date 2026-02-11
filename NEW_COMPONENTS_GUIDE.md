# New Components Guide

## 📱 ProfileNav Component

**Location**: `components/ProfileNav.tsx`

### Features:
- ✅ User profile header with avatar, name, username, and bio
- ✅ Stats display (Posts, Followers, Following)
- ✅ Edit Profile and Share buttons
- ✅ Recent posts grid (3 columns)
- ✅ Menu sections with icons:
  - **My Content**: Liked Wallpapers, Saved Collections, Recently Viewed
  - **Settings**: Account Settings, Notifications, Display & Appearance, Privacy & Security
  - **Support**: Help & Support, Share App
- ✅ Logout button with red styling
- ✅ App version info at bottom
- ✅ Smooth slide-up animation
- ✅ Sticky header with back button

### Triggers:
- User clicks "Profile" icon in bottom navigation
- Shows when `activeTab === 'profile'`

### Props:
```typescript
{
  onClose: () => void;           // Close handler (sets activeTab to 'home')
  wallpapers: Wallpaper[];       // All wallpapers for recent posts
  onWallpaperClick: (wp) => void; // Navigate to wallpaper detail
}
```

---

## 🔔 NotificationNav Component

**Location**: `components/NotificationNav.tsx`

### Features:
- ✅ Header with notification count and settings button
- ✅ "Mark all as read" quick action button
- ✅ Six notification types with unique icons and colors:
  - ❤️ **Like**: Red heart icon
  - ⬇️ **Download**: Blue download icon
  - 👥 **Follow**: Green user-plus icon
  - 💬 **Comment**: Purple message icon
  - 🔥 **Trending**: Orange trending icon
  - 🏆 **Achievement**: Yellow award icon
- ✅ Unread indicator (blue dot)
- ✅ Thumbnail preview for wallpaper-related notifications
- ✅ User avatars with small icon overlays
- ✅ Time stamps (2m ago, 1h ago, 1d ago, etc.)
- ✅ Empty state with "You're all caught up!" message
- ✅ Load More button
- ✅ Visual distinction for read/unread (opacity difference)

### Notification Structure:
```typescript
{
  id: string;
  type: 'like' | 'download' | 'follow' | 'comment' | 'trending' | 'achievement';
  user?: { name: string; avatar: string; }; // Optional for system notifications
  message: string;
  time: string;
  thumbnail?: string;  // Optional wallpaper preview
  read: boolean;
}
```

### Triggers:
- User clicks "Alerts" icon in bottom navigation
- Shows when `activeTab === 'notifications'`

### Props:
```typescript
{
  onClose: () => void;  // Close handler (sets activeTab to 'home')
}
```

---

## 🎯 Integration

Both components are now fully integrated into the main `WallpaperGallery.tsx`:

```typescript
// Profile view
{activeTab === 'profile' && (
  <ProfileNav
    onClose={() => setActiveTab('home')}
    wallpapers={wallpapers}
    onWallpaperClick={(wp) => {
      setActiveTab('home');
      setSelectedWallpaper(wp);
    }}
  />
)}

// Notifications view
{activeTab === 'notifications' && (
  <NotificationNav
    onClose={() => setActiveTab('home')}
  />
)}
```

---

## 🎨 Design Details

### ProfileNav:
- **Color Scheme**: Gradient background (gray-900 to black)
- **Icons**: Lucide React icons with custom colors
- **Layout**: Centered content, max-width 2xl
- **Interactive Elements**: All menu items are clickable buttons with hover effects
- **Stats**: Formatted with k suffix for numbers > 1000

### NotificationNav:
- **Color Coding**: Each notification type has unique color
- **Visual Hierarchy**: Unread items have subtle background
- **Smart Grouping**: User notifications show avatar + icon
- **Responsive**: Works on mobile and desktop
- **Interactive**: All notifications are clickable

---

## 🔄 Navigation Flow

```
Home (Gallery)
  ├─→ Click Profile Icon → ProfileNav
  │     ├─→ Click Recent Post → WallpaperDetail
  │     └─→ Click Back → Home
  │
  └─→ Click Alerts Icon → NotificationNav
        └─→ Click Back → Home
```

---

## 💡 Tips for Customization

### ProfileNav:
1. Update `currentUser` object with real user data
2. Add API calls in menu item click handlers
3. Customize menu sections based on user role
4. Add more quick stats (Views, Downloads, etc.)

### NotificationNav:
1. Connect to real-time notification service
2. Implement actual "Mark as read" functionality
3. Add notification filtering (All, Unread, Mentions)
4. Add click handlers to navigate to related content
5. Implement infinite scroll for Load More

---

## 📊 Mock Data

Currently uses hardcoded mock data for demonstration:
- **ProfileNav**: Static user profile with example menu items
- **NotificationNav**: 9 sample notifications of different types

Replace with actual API calls in production!
