import type { HookAlert } from '@claude-orchestrator/shared';
import { getHookIcon } from '../../utils/tools';

interface NotificationItemProps {
  notification: HookAlert;
  onView: () => void;
  onDismiss: () => void;
}

export function NotificationItem({ notification, onView, onDismiss }: NotificationItemProps) {
  return (
    <div
      className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={onView}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{getHookIcon(notification.hook.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white truncate">
              {notification.sessionName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-gray-500 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-yellow-400 mt-0.5">{notification.hook.toolName}</div>
          {notification.hook.preview && (
            <div className="text-xs text-gray-500 mt-1 truncate font-mono">
              {notification.hook.preview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
