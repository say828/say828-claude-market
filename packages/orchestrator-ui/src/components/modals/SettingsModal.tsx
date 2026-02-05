import { NotificationSettings, AppSettings, HookType } from '@claude-orchestrator/shared';
import { getHookIcon } from '../../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (settings: Partial<AppSettings>) => void;
  onPlaySound: () => void;
  onRequestBrowserPermission: () => Promise<boolean>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  appSettings,
  onUpdateAppSettings,
  onPlaySound,
  onRequestBrowserPermission,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const toggleHookType = (type: HookType) => {
    onUpdateSettings({
      enabledHooks: { ...settings.enabledHooks, [type]: !settings.enabledHooks[type] }
    });
  };

  const toggleSound = () => {
    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const setSoundType = (soundType: 'gentle' | 'chime' | 'alert' | 'none') => {
    onUpdateSettings({ soundType });
    setTimeout(() => onPlaySound(), 100);
  };

  const toggleBrowserNotifications = async () => {
    if (!settings.browserNotifications) {
      const granted = await onRequestBrowserPermission();
      if (granted) {
        onUpdateSettings({ browserNotifications: true });
      }
    } else {
      onUpdateSettings({ browserNotifications: false });
    }
  };

  const setAutoDeleteMinutes = (minutes: number) => {
    onUpdateSettings({ autoDeleteMinutes: minutes });
  };

  const setServerUrl = (url: string) => {
    onUpdateAppSettings({ serverUrl: url });
  };

  const reconnectToServer = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold text-white text-sm">Notification Settings</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Hook Types */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Hook Types</div>
            <div className="grid grid-cols-2 gap-2">
              {(['bash', 'edit', 'plan', 'question'] as const).map(type => (
                <label key={type} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer border border-white/5">
                  <input
                    type="checkbox"
                    checked={settings.enabledHooks[type]}
                    onChange={() => toggleHookType(type)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-base">{getHookIcon(type)}</span>
                  <span className="text-white text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sound</div>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={toggleSound}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-white text-sm">Enable Sound</span>
              </label>
            </div>
            {settings.soundEnabled && (
              <div className="grid grid-cols-3 gap-2">
                {(['gentle', 'chime', 'alert'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSoundType(type)}
                    className={`p-2 rounded text-sm border transition-colors ${
                      settings.soundType === type
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {type === 'gentle' ? '🔕 Gentle' : type === 'chime' ? '🔔 Chime' : '🚨 Alert'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Browser Notifications */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Browser Notifications</div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.browserNotifications}
                  onChange={toggleBrowserNotifications}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-white text-sm">Desktop Notifications</span>
              </label>
              {settings.browserNotifications && (
                <span className="text-xs text-green-400">✓ Enabled</span>
              )}
            </div>
          </div>

          {/* Auto-Delete Timer */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Auto-Delete</div>
            <div className="flex items-center gap-3">
              <span className="text-white text-sm">Remove after</span>
              <select
                value={settings.autoDeleteMinutes}
                onChange={(e) => setAutoDeleteMinutes(parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="0">Never</option>
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>

          {/* Server Connection */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Server Connection</div>
            <input
              type="text"
              value={appSettings.serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:18700 (default: current origin)"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for local Claude Code. Requires page reload.</p>
            {appSettings.serverUrl && (
              <button
                onClick={reconnectToServer}
                className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
              >
                Reconnect to Server
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
