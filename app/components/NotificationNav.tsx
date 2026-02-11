import { ChevronLeft, Heart, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

type NotificationNavProps = {
  onClose: () => void;
};

export const NotificationNav = ({ onClose }: NotificationNavProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold">Notifications</h1>
            {unreadCount > 0 && <p className="text-xs text-white/60">{unreadCount} unread</p>}
          </div>
          <div className="w-10" />
        </div>

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
                onClick={() => markAsRead(notification.id)}
                className={`w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-all ${
                  !notification.read ? 'bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex-shrink-0 relative">
                  <img
                    src={notification.user.avatar}
                    alt={notification.user.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-red-500/10">
                    <Heart className="w-4 h-4 text-red-400" fill="currentColor" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm text-white leading-relaxed">
                    <span className="font-semibold">{notification.user.name} </span>
                    <span className={notification.read ? 'text-white/60' : 'text-white/90'}>
                      {notification.message}
                    </span>
                  </p>
                  <p className="text-xs text-white/40 mt-1">{notification.time}</p>
                </div>

                {notification.thumbnail && (
                  <img
                    src={notification.thumbnail}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 self-center" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};