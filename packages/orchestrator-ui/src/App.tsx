import { useState, useEffect, useCallback } from 'react';
import type {
  SessionSummary,
  DisplayMessage,
  NotificationSettings,
  AppSettings,
  DashboardStats
} from '@claude-orchestrator/shared';

// Views
import PluginsView from './views/PluginsView';
import SettingsView from './views/SettingsView';
import AnalyticsView from './views/AnalyticsView';

// Components
import { TopNavigation } from './components/layout';
import { SessionList, SessionDetail } from './components/sessions';
import { NotificationPanel } from './components/notifications';
import { NewSessionModal, SettingsModal } from './components/modals';

// Hooks
import { useWebSocket, useNotifications, useSession } from './hooks';

// Context
import { ThemeProvider } from './context';

type TabType = 'sessions' | 'analytics' | 'plugins' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<DisplayMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  // Settings
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('orchestrator-app-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return { serverUrl: '' };
  });

  const baseUrl = appSettings.serverUrl || '';

  // Notifications hook
  const {
    settings,
    notifications,
    updateSettings,
    playNotificationSound,
    showBrowserNotification,
    requestBrowserNotificationPermission,
    dismissNotification,
    clearAllNotifications,
  } = useNotifications();

  // WebSocket hook
  const { connected, sessions, stats, subscribeToWebSession, unsubscribeFromWebSession } = useWebSocket({
    serverUrl: appSettings.serverUrl,
    enabledHooks: settings.enabledHooks,
    onHookAlert: (alert) => {
      playNotificationSound();
      showBrowserNotification(alert);
    },
    onWebSessionMessage: (sessionId, message) => {
      handleWebSessionMessage(sessionId, message);
    },
  });

  // Session management hook
  const {
    connectedSessions,
    connectSession: connectSessionBase,
    disconnectSession,
    sendMessage,
    sendControlSignal: sendControlSignalBase,
    handleWebSessionMessage,
    fetchSessionMessages,
  } = useSession({ baseUrl });

  // Fetch session messages when selected (only if not connected)
  useEffect(() => {
    if (!selectedSession) {
      setSessionMessages([]);
      return;
    }
    if (!connectedSessions.has(selectedSession)) {
      fetchSessionMessages(selectedSession)
        .then(messages => setSessionMessages(messages))
        .catch(err => console.error('Failed to fetch session:', err));
    }
  }, [selectedSession, connectedSessions, fetchSessionMessages]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('orchestrator-app-settings', JSON.stringify(appSettings));
  }, [appSettings]);

  // Handlers
  const handleConnectSession = useCallback(async (cwd: string, resumeSessionId?: string) => {
    const sessionId = await connectSessionBase(cwd, resumeSessionId);
    if (sessionId) {
      setSelectedSession(sessionId);
      setShowNewSessionModal(false);
      subscribeToWebSession(sessionId);
    }
  }, [connectSessionBase, subscribeToWebSession]);

  const handleDisconnectSession = useCallback(async (sessionId: string) => {
    await disconnectSession(sessionId);
    unsubscribeFromWebSession(sessionId);
  }, [disconnectSession, unsubscribeFromWebSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    try {
      const res = await fetch(`${baseUrl}/api/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSession === sessionId) {
          setSelectedSession(null);
        }
        await handleDisconnectSession(sessionId);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [baseUrl, selectedSession, handleDisconnectSession]);

  const handleSendMessage = useCallback(async (sessionId: string, message: string) => {
    return await sendMessage(sessionId, message);
  }, [sendMessage]);

  const handleControlSignal = useCallback((sessionId: string, signal: string) => {
    sendControlSignalBase(sessionId, signal);
  }, [sendControlSignalBase]);

  const handleSlashCommand = useCallback(async (sessionId: string, command: string) => {
    await sendControlSignalBase(sessionId, command);
  }, [sendControlSignalBase]);

  const handleOpenEditor = useCallback(async (editor: string, path: string) => {
    try {
      await fetch(`${baseUrl}/api/open-editor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editor, path })
      });
    } catch (err) {
      console.error('Failed to open editor:', err);
    }
  }, [baseUrl]);

  const viewSessionFromNotification = useCallback((sessionId: string, index: number) => {
    setSelectedSession(sessionId);
    setActiveTab('sessions');
    dismissNotification(index);
    setShowNotifications(false);
  }, [dismissNotification]);

  // Loading state
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Claude Orchestrator</div>
          <div className="text-sm text-gray-500 mt-2">Connecting...</div>
        </div>
      </div>
    );
  }

  const currentSession = selectedSession ? sessions.find(s => s.id === selectedSession) : null;
  const currentConnected = selectedSession ? connectedSessions.get(selectedSession) : undefined;

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
        {/* Top Navigation */}
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notificationCount={notifications.length}
          onNotificationsClick={() => setShowNotifications(!showNotifications)}
          onSettingsClick={() => setShowSettings(!showSettings)}
        />

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {activeTab === 'analytics' ? (
            <AnalyticsView sessions={sessions} stats={stats} />
          ) : activeTab === 'plugins' ? (
            <PluginsView />
          ) : activeTab === 'settings' ? (
            <SettingsView />
          ) : (
            <>
              {/* Session List Sidebar */}
              <SessionList
                sessions={sessions}
                stats={stats}
                selectedSession={selectedSession}
                connectedSessions={connectedSessions}
                onSelectSession={setSelectedSession}
                onNewSession={() => setShowNewSessionModal(true)}
              />

              {/* Session Detail */}
              {currentSession ? (
                <SessionDetail
                  session={currentSession}
                  messages={sessionMessages}
                  connectedSession={currentConnected}
                  onConnect={() => handleConnectSession(currentSession.cwd, currentSession.id)}
                  onDisconnect={() => handleDisconnectSession(currentSession.id)}
                  onDelete={() => handleDeleteSession(currentSession.id)}
                  onOpenEditor={handleOpenEditor}
                  onSendMessage={(msg) => handleSendMessage(currentSession.id, msg)}
                  onControlSignal={(signal) => handleControlSignal(currentSession.id, signal)}
                  onSlashCommand={(cmd) => handleSlashCommand(currentSession.id, cmd)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-4">🚀</div>
                    <div className="text-lg text-gray-400 mb-4">Select a session or start a new one</div>
                    <button
                      onClick={() => setShowNewSessionModal(true)}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                    >
                      <span className="material-icons">add</span>
                      New Session
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onDismiss={dismissNotification}
            onClearAll={clearAllNotifications}
            onView={viewSessionFromNotification}
            onClose={() => setShowNotifications(false)}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={updateSettings}
          appSettings={appSettings}
          onUpdateAppSettings={(updates) => setAppSettings(prev => ({ ...prev, ...updates }))}
          onPlaySound={playNotificationSound}
          onRequestBrowserPermission={requestBrowserNotificationPermission}
        />

        {/* New Session Modal */}
        <NewSessionModal
          isOpen={showNewSessionModal}
          onClose={() => setShowNewSessionModal(false)}
          onCreateSession={(path) => handleConnectSession(path)}
        />
      </div>
    </ThemeProvider>
  );
}
