import { ChevronLeft, Heart, Download, UserPlus, MessageCircle, TrendingUp, Award, CheckCheck, Settings } from 'lucide-react';

type Notification = {
  id: string;
  type: 'like' | 'download' | 'follow' | 'comment' | 'trending' | 'achievement';
  user?: {
    name: string;
    avatar: string;
  };
  message: string;
  time: string;
  thumbnail?: string;
  read: boolean;
};

type NotificationNavProps = {
  onClose: () => void;
};

export const NotificationNav = ({ onClose }: NotificationNavProps) => {
  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      user: { name: 'Sarah Miller', avatar: 'https://i.pravatar.cc/150?img=10' },
      message: 'liked your wallpaper "Stunning Nature Wallpaper"',
      time: '2m ago',
      thumbnail: 'https://picsum.photos/id/10/100/150',
      read: false,
    },
    {
      id: '2',
      type: 'follow',
      user: { name: 'Mike Johnson', avatar: 'https://i.pravatar.cc/150?img=20' },
      message: 'started following you',
      time: '15m ago',
      read: false,
    },
    {
      id: '3',
      type: 'download',
      user: { name: 'Emma Davis', avatar: 'https://i.pravatar.cc/150?img=30' },
      message: 'downloaded your wallpaper',
      time: '1h ago',
      thumbnail: 'https://picsum.photos/id/20/100/150',
      read: false,
    },
    {
      id: '4',
      type: 'trending',
      message: 'Your wallpaper "Epic Abstract Wallpaper" is trending! 🔥',
      time: '2h ago',
      thumbnail: 'https://picsum.photos/id/30/100/150',
      read: true,
    },
    {
      id: '5',
      type: 'comment',
      user: { name: 'Chris Lee', avatar: 'https://i.pravatar.cc/150?img=40' },
      message: 'commented: "Amazing work! Love the colors 🎨"',
      time: '3h ago',
      thumbnail: 'https://picsum.photos/id/40/100/150',
      read: true,
    },
    {
      id: '6',
      type: 'achievement',
      message: 'Congratulations! You reached 10k downloads 🎉',
      time: '5h ago',
      read: true,
    },
    {
      id: '7',
      type: 'like',
      user: { name: 'Alex Chen', avatar: 'https://i.pravatar.cc/150?img=50' },
      message: 'liked your wallpaper',
      time: '1d ago',
      thumbnail: 'https://picsum.photos/id/50/100/150',
      read: true,
    },
    {
      id: '8',
      type: 'follow',
      user: { name: 'Jessica Park', avatar: 'https://i.pravatar.cc/150?img=5' },
      message: 'started following you',
      time: '1d ago',
      read: true,
    },
    {
      id: '9',
      type: 'download',
      user: { name: 'David Kim', avatar: 'https://i.pravatar.cc/150?img=15' },
      message: 'downloaded 3 of your wallpapers',
      time: '2d ago',
      read: true,
    },
  ];

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-400" fill="currentColor" />;
      case 'download':
        return <Download className="w-5 h-5 text-blue-400" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-purple-400" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-orange-400" />;
      case 'achievement':
        return <Award className="w-5 h-5 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return 'bg-red-500/10';
      case 'download':
        return 'bg-blue-500/10';
      case 'follow':
        return 'bg-green-500/10';
      case 'comment':
        return 'bg-purple-500/10';
      case 'trending':
        return 'bg-orange-500/10';
      case 'achievement':
        return 'bg-yellow-500/10';
      default:
        return 'bg-white/5';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    console.log('Marking all notifications as read');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-white/60">{unreadCount} unread</p>
            )}
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Actions */}
        {unreadCount > 0 && (
          <div className="px-4 pb-3">
            <button
              onClick={markAllAsRead}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl mx-auto w-full">
        {notifications.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
              <CheckCheck className="w-10 h-10 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">You're all caught up!</h3>
            <p className="text-white/60">No new notifications at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-all ${
                  !notification.read ? 'bg-white/[0.02]' : ''
                }`}
              >
                {/* Icon or Avatar */}
                <div className="flex-shrink-0">
                  {notification.user ? (
                    <div className="relative">
                      <img
                        src={notification.user.avatar}
                        alt={notification.user.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full ${getIconBg(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-full ${getIconBg(notification.type)} flex items-center justify-center`}>
                      {getIcon(notification.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm text-white leading-relaxed">
                    {notification.user && (
                      <span className="font-semibold">{notification.user.name} </span>
                    )}
                    <span className={notification.read ? 'text-white/60' : 'text-white/90'}>
                      {notification.message}
                    </span>
                  </p>
                  <p className="text-xs text-white/40 mt-1">{notification.time}</p>
                </div>

                {/* Thumbnail */}
                {notification.thumbnail && (
                  <div className="flex-shrink-0">
                    <img
                      src={notification.thumbnail}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  </div>
                )}

                {/* Unread Indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0 self-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Load More */}
        {notifications.length > 0 && (
          <div className="p-4">
            <button className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
