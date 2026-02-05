# Modal Components

This directory contains reusable modal components for the Claude Orchestrator UI.

## Components

### NewSessionModal

A modal for creating new Claude Code sessions.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Called when modal should close
- `onCreateSession: (path: string) => void` - Called when user submits a path

**Features:**
- Auto-focus on input when opened
- Enter key to submit
- Escape key to close
- Validation for empty paths
- Placeholder text: "/path/to/your/project"

**Example:**
```tsx
import { NewSessionModal } from './components/modals';

const [showNewSessionModal, setShowNewSessionModal] = useState(false);

<NewSessionModal
  isOpen={showNewSessionModal}
  onClose={() => setShowNewSessionModal(false)}
  onCreateSession={(path) => {
    console.log('Starting session in:', path);
    setShowNewSessionModal(false);
  }}
/>
```

### SettingsModal

A modal for configuring notification and app settings.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Called when modal should close
- `settings: NotificationSettings` - Current notification settings
- `onUpdateSettings: (settings: Partial<NotificationSettings>) => void` - Update notification settings
- `appSettings: AppSettings` - Current app settings
- `onUpdateAppSettings: (settings: Partial<AppSettings>) => void` - Update app settings
- `onPlaySound: () => void` - Play notification sound (for preview)
- `onRequestBrowserPermission: () => Promise<boolean>` - Request browser notification permission

**Features:**
- Hook type toggles (bash, edit, plan, question) with icons
- Sound enable/disable with type selection (gentle, chime, alert)
- Browser notification toggle with permission request
- Auto-delete timer selection (never, 1min, 5min, 15min, 30min, 1hr)
- Server URL input for remote connections
- Reconnect button (triggers page reload)

**Example:**
```tsx
import { SettingsModal } from './components/modals';

const [showSettings, setShowSettings] = useState(false);
const [settings, setSettings] = useState<NotificationSettings>({
  enabledHooks: { bash: true, edit: true, plan: true, question: true },
  soundEnabled: true,
  soundType: 'chime',
  browserNotifications: false,
  autoDeleteMinutes: 5
});
const [appSettings, setAppSettings] = useState<AppSettings>({
  serverUrl: ''
});

<SettingsModal
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  settings={settings}
  onUpdateSettings={(partial) => setSettings(prev => ({ ...prev, ...partial }))}
  appSettings={appSettings}
  onUpdateAppSettings={(partial) => setAppSettings(prev => ({ ...prev, ...partial }))}
  onPlaySound={playNotificationSound}
  onRequestBrowserPermission={async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }}
/>
```

## Styling

All modals follow the Claude Code design system:
- Dark theme with `bg-[#0a0a0a]` background
- Border: `border-white/10`
- Overlay: `bg-black/50`
- Consistent padding and spacing
- Smooth transitions
- Accessible focus states

## Integration with App.tsx

These modals are designed to replace the inline modal implementations in App.tsx:
- Lines 1372-1419: NewSessionModal
- Lines 1252-1369: SettingsModal

To integrate, simply import and use:
```tsx
import { NewSessionModal, SettingsModal } from './components/modals';
```

Then replace the existing inline JSX with the component instances.
