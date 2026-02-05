import { useState, useEffect, useRef, useCallback } from 'react';
import PluginsView from './views/PluginsView';
import SettingsView from './views/SettingsView';

type TabType = 'sessions' | 'plugins' | 'settings';

interface SessionSummary {
  id: string;
  projectName: string;
  cwd: string;
  gitBranch?: string;
  lastActivity: string;
  messageCount: number;
  status: 'active' | 'idle' | 'pending_hook';
  lastMessage?: string;
  pendingHook?: {
    type: string;
    toolName: string;
  };
}

interface HookAlert {
  sessionId: string;
  sessionName: string;
  hook: {
    type: 'bash' | 'edit' | 'plan' | 'question';
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
    timestamp: Date;
    preview?: string;
  };
}

interface NotificationSettings {
  enabledHooks: {
    bash: boolean;
    edit: boolean;
    plan: boolean;
    question: boolean;
  };
  soundEnabled: boolean;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
  };
  toolResult?: {
    content: string;
    isError: boolean;
  };
}

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  pendingHooks: number;
  projectCount: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    pendingHooks: 0,
    projectCount: 0
  });
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<HookAlert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('orchestrator-notification-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      enabledHooks: { bash: true, edit: true, plan: true, question: true },
      soundEnabled: true
    };
  });
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  }, [settings.soundEnabled]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onopen = () => {
      setLoading(false);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init' || data.type === 'sessions_update') {
          const payload = data.type === 'init' ? data.data : { sessions: data.data };
          setSessions(payload.sessions || data.data);
          if (payload.stats) {
            setStats(payload.stats);
          }
        } else if (data.type === 'hook_alert') {
          const alert: HookAlert = data.data;
          if (settings.enabledHooks[alert.hook.type]) {
            setNotifications(prev => [alert, ...prev].slice(0, 50)); // Keep last 50
            playNotificationSound();
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };
    ws.onclose = () => {
      setTimeout(() => window.location.reload(), 2000);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [settings.enabledHooks, playNotificationSound]);

  useEffect(() => {
    if (!selectedSession) {
      setSessionMessages([]);
      return;
    }
    fetch(`/api/session/${selectedSession}`)
      .then(res => res.json())
      .then(data => setSessionMessages(data.messages || []))
      .catch(err => console.error('Failed to fetch session:', err));
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages]);

  useEffect(() => {
    setStats({
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      pendingHooks: sessions.filter(s => s.status === 'pending_hook').length,
      projectCount: new Set(sessions.map(s => s.projectName)).size
    });
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('orchestrator-notification-settings', JSON.stringify(settings));
  }, [settings]);

  const dismissNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  const viewSessionFromNotification = (sessionId: string, index: number) => {
    setSelectedSession(sessionId);
    setActiveTab('sessions');
    dismissNotification(index);
    setShowNotifications(false);
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedSession === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const toggleHookType = (type: keyof NotificationSettings['enabledHooks']) => {
    setSettings(prev => ({
      ...prev,
      enabledHooks: { ...prev.enabledHooks, [type]: !prev.enabledHooks[type] }
    }));
  };

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleExpand = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getHookIcon = (type: string) => {
    switch (type) {
      case 'bash': return '💻';
      case 'edit': return '📝';
      case 'plan': return '📋';
      case 'question': return '❓';
      default: return '⚡';
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'pending_hook': return 'status-pending';
      default: return 'status-idle';
    }
  };

  const getToolColor = (name: string) => {
    switch (name) {
      case 'Bash': return 'text-yellow-400';
      case 'Read': return 'text-blue-400';
      case 'Write': case 'Edit': return 'text-green-400';
      case 'Grep': case 'Glob': return 'text-purple-400';
      case 'Task': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const formatToolInput = (name: string, input: Record<string, unknown>) => {
    if (name === 'Bash' && input.command) {
      return String(input.command).split('\n')[0].slice(0, 60) + (String(input.command).length > 60 ? '…' : '');
    }
    if (name === 'Read' && input.file_path) {
      return String(input.file_path);
    }
    if ((name === 'Write' || name === 'Edit') && input.file_path) {
      return String(input.file_path);
    }
    if (name === 'Grep' && input.pattern) {
      return `"${input.pattern}"`;
    }
    if (name === 'Glob' && input.pattern) {
      return `"${input.pattern}"`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Claude Orchestrator</div>
          <div className="text-sm text-gray-500 mt-2">Connecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Top Navigation */}
      <div className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-4 px-4 py-2">
          <h1 className="font-semibold text-white text-sm">Claude Orchestrator</h1>
          <div className="flex-1" />
          <div className="flex gap-1">
            {(['sessions', 'plugins', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white relative"
            title="Notifications"
          >
            <span className="material-icons text-xl">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
            title="Notification Settings"
          >
            <span className="material-icons text-xl">settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {activeTab === 'plugins' ? (
          <PluginsView />
        ) : activeTab === 'settings' ? (
          <SettingsView />
        ) : (
          <>
            {/* Session List Sidebar */}
            <div className="w-72 border-r border-white/10 flex flex-col bg-[#0a0a0a] overflow-hidden">
              <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-gray-500">{sessions.length} sessions</span>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-400">{stats.activeSessions} active</span>
                  <span className="text-yellow-400">{stats.pendingHooks} pending</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={`px-3 py-2 cursor-pointer border-l-2 transition-colors ${
                      selectedSession === session.id
                        ? 'bg-white/10 border-l-blue-500'
                        : 'border-l-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(session.status)}`} />
                      <span className="text-sm font-medium text-white truncate flex-1">{session.projectName}</span>
                      <span className="text-xs text-gray-600">{formatTime(session.lastActivity)}</span>
                    </div>
                    {session.gitBranch && (
                      <div className="text-xs text-purple-400 mt-0.5 ml-3.5 truncate">⎇ {session.gitBranch}</div>
                    )}
                    {session.pendingHook && (
                      <div className="mt-1 ml-3.5 text-xs text-yellow-400">⏳ {session.pendingHook.toolName}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Session Detail - Claude Code Style */}
            <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden min-h-0">
              {selectedSession ? (
                <>
                  {/* Session Header */}
                  {(() => {
                    const session = sessions.find(s => s.id === selectedSession);
                    if (!session) return null;
                    return (
                      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                        <span className="text-white font-medium">{session.projectName}</span>
                        <span className="text-gray-500 text-sm font-mono truncate flex-1">{session.cwd}</span>
                        {session.gitBranch && (
                          <span className="text-purple-400 text-sm">⎇ {session.gitBranch}</span>
                        )}
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete session"
                        >
                          <span className="material-icons text-lg">delete</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Messages - Claude Code Terminal Style */}
                  <div className="flex-1 overflow-y-auto font-mono text-sm min-h-0">
                    {sessionMessages.map((msg, idx) => (
                      <div key={msg.id} className="border-b border-white/5">
                        {msg.role === 'user' && msg.content && (
                          <div className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <span className="text-green-400 font-bold">&gt;</span>
                              <span className="text-white whitespace-pre-wrap">{msg.content}</span>
                            </div>
                          </div>
                        )}

                        {msg.role === 'assistant' && (
                          <div className="px-4 py-2">
                            {/* Tool Use */}
                            {msg.toolUse && (
                              <div className="flex items-start gap-2 mb-1">
                                <span className="text-yellow-400">●</span>
                                <div className="flex-1">
                                  <span className={`${getToolColor(msg.toolUse.name)}`}>
                                    {msg.toolUse.name}
                                  </span>
                                  <span className="text-gray-500">(</span>
                                  <span className="text-gray-300">{formatToolInput(msg.toolUse.name, msg.toolUse.input)}</span>
                                  <span className="text-gray-500">)</span>
                                </div>
                              </div>
                            )}

                            {/* Tool Result */}
                            {msg.toolResult && (
                              <div className="ml-4 mt-1">
                                <div
                                  className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 py-1 -ml-2"
                                  onClick={() => toggleExpand(msg.id)}
                                >
                                  <span className="text-gray-500">└</span>
                                  {msg.toolResult.isError ? (
                                    <span className="text-red-400">Error</span>
                                  ) : (
                                    <span className="text-gray-400">
                                      {msg.toolResult.content.split('\n').length} lines
                                    </span>
                                  )}
                                  <span className="text-gray-600 text-xs">(click to {expandedResults.has(msg.id) ? 'collapse' : 'expand'})</span>
                                </div>
                                {expandedResults.has(msg.id) && (
                                  <pre className={`mt-2 p-3 rounded text-xs overflow-x-auto ${
                                    msg.toolResult.isError ? 'bg-red-500/10 text-red-300' : 'bg-white/5 text-gray-300'
                                  }`}>
                                    {msg.toolResult.content}
                                  </pre>
                                )}
                              </div>
                            )}

                            {/* Text Content */}
                            {msg.content && !msg.toolUse && (
                              <div className="text-white whitespace-pre-wrap">{msg.content}</div>
                            )}
                            {msg.content && msg.toolUse && (
                              <div className="ml-4 mt-2 text-white whitespace-pre-wrap">{msg.content}</div>
                            )}
                          </div>
                        )}

                        {msg.role === 'system' && (
                          <div className="px-4 py-2 bg-purple-500/10">
                            <span className="text-purple-400">● System</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-5xl mb-4">←</div>
                    <div className="text-lg">Select a session</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed right-0 top-12 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in-right">
          <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-icons text-lg">notifications</span>
              <span className="font-semibold text-white text-sm">Notifications</span>
              <span className="text-xs text-gray-500">({notifications.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={clearAllNotifications} className="text-xs text-gray-400 hover:text-white">
                  Clear all
                </button>
              )}
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="material-icons text-4xl mb-2">notifications_off</span>
                <div className="text-sm">No notifications</div>
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div
                  key={`${notif.sessionId}-${notif.hook.toolUseId}-${idx}`}
                  className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => viewSessionFromNotification(notif.sessionId, idx)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getHookIcon(notif.hook.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white truncate">{notif.sessionName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(idx); }}
                          className="text-gray-500 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-yellow-400 mt-0.5">{notif.hook.toolName}</div>
                      {notif.hook.preview && (
                        <div className="text-xs text-gray-500 mt-1 truncate font-mono">{notif.hook.preview}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Notification Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2">
              {(['bash', 'edit', 'plan', 'question'] as const).map(type => (
                <label key={type} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                  <input type="checkbox" checked={settings.enabledHooks[type]} onChange={() => toggleHookType(type)} className="w-4 h-4" />
                  <span className="text-lg">{getHookIcon(type)}</span>
                  <span className="text-white text-sm capitalize">{type}</span>
                </label>
              ))}
              <div className="border-t border-white/10 pt-2 mt-2">
                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                  <input type="checkbox" checked={settings.soundEnabled} onChange={toggleSound} className="w-4 h-4" />
                  <span className="text-lg">🔔</span>
                  <span className="text-white text-sm">Sound</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
