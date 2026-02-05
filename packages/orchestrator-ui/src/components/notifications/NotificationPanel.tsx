import type { HookAlert } from '@claude-orchestrator/shared';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  notifications: HookAlert[];
  onDismiss: (index: number) => void;
  onClearAll: () => void;
  onView: (sessionId: string, index: number) => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  onDismiss,
  onClearAll,
  onView,
  onClose,
}: NotificationPanelProps) {
  return (
    <div className="fixed right-0 top-12 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-50 animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          {notifications.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-sm text-center">No notifications</p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <NotificationItem
              key={`${notification.sessionId}-${notification.hook.toolUseId}-${index}`}
              notification={notification}
              onView={() => onView(notification.sessionId, index)}
              onDismiss={() => onDismiss(index)}
            />
          ))
        )}
      </div>
    </div>
  );
}
