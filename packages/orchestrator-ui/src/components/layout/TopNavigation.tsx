interface TopNavigationProps {
  activeTab: 'sessions' | 'analytics' | 'plugins' | 'settings';
  onTabChange: (tab: 'sessions' | 'analytics' | 'plugins' | 'settings') => void;
  notificationCount: number;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
}

export function TopNavigation({
  activeTab,
  onTabChange,
  notificationCount,
  onNotificationsClick,
  onSettingsClick,
}: TopNavigationProps) {
  const tabs = ['sessions', 'analytics', 'plugins', 'settings'] as const;

  return (
    <div className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="flex items-center gap-4 px-4 py-2">
        <h1 className="font-semibold text-white text-sm">Claude Orchestrator</h1>
        <div className="flex-1" />
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={onNotificationsClick}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white relative"
          title="Notifications"
        >
          <span className="material-icons text-xl">notifications</span>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
        <button
          onClick={onSettingsClick}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
          title="Notification Settings"
        >
          <span className="material-icons text-xl">settings</span>
        </button>
      </div>
    </div>
  );
}
