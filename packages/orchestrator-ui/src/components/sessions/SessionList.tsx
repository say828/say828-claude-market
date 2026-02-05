import type { SessionSummary, WebSessionStatus, DashboardStats } from '@claude-orchestrator/shared';
import { StatusDot } from '../common/StatusDot';
import { formatRelativeTime } from '../../utils/time';

interface SessionListProps {
  sessions: SessionSummary[];
  stats: DashboardStats;
  selectedSession: string | null;
  connectedSessions: Map<string, { status: WebSessionStatus }>;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionList({
  sessions,
  stats,
  selectedSession,
  connectedSessions,
  onSelectSession,
  onNewSession,
}: SessionListProps) {
  const isConnected = (sessionId: string) => connectedSessions.has(sessionId);
  const getConnectedStatus = (sessionId: string) => connectedSessions.get(sessionId)?.status;

  return (
    <div className="w-72 border-r border-white/10 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* New Session Button */}
      <div className="p-2 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onNewSession}
          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-icons text-lg">add</span>
          New Session
        </button>
      </div>

      {/* Stats */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-500">{sessions.length} sessions</span>
        <div className="flex gap-2 text-xs">
          <span className="text-green-400">{connectedSessions.size} connected</span>
          <span className="text-yellow-400">{stats.pendingHooks} pending</span>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.map((session) => {
          const connected = isConnected(session.id);
          const connStatus = getConnectedStatus(session.id);

          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`px-3 py-2 cursor-pointer border-l-2 transition-colors ${
                selectedSession === session.id
                  ? 'bg-white/10 border-l-blue-500'
                  : 'border-l-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <StatusDot
                  status={
                    connected
                      ? connStatus === 'active'
                        ? 'active'
                        : connStatus === 'starting'
                        ? 'starting'
                        : 'idle'
                      : 'idle'
                  }
                />
                <span className="text-sm font-medium text-white truncate flex-1">
                  {session.projectName}
                </span>
                <span className="text-xs text-gray-600">
                  {formatRelativeTime(session.lastActivity)}
                </span>
              </div>
              {session.gitBranch && (
                <div className="text-xs text-purple-400 mt-0.5 ml-4 truncate">
                  ⎇ {session.gitBranch}
                </div>
              )}
              {session.pendingHook && !connected && (
                <div className="mt-1 ml-4 text-xs text-yellow-400">
                  ⏳ {session.pendingHook.toolName}
                </div>
              )}
              {connected && (
                <div className="mt-1 ml-4 text-xs text-green-400">● Connected</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
