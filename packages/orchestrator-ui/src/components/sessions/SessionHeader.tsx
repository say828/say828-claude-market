import type { SessionSummary, ConnectedSession, DisplayMessage } from '@claude-orchestrator/shared';
import { StatusDot } from '../common/StatusDot';
import { ExportButton } from './ExportButton';

interface SessionHeaderProps {
  session: SessionSummary;
  messages: DisplayMessage[];
  connectedSession: ConnectedSession | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onOpenEditor: (editor: string, path: string) => void;
}

export function SessionHeader({
  session,
  messages,
  connectedSession,
  onConnect,
  onDisconnect,
  onDelete,
  onOpenEditor,
}: SessionHeaderProps) {
  const isConnected = !!connectedSession;

  return (
    <div className="px-4 py-2 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
      <StatusDot
        status={
          connectedSession
            ? connectedSession.status === 'active'
              ? 'active'
              : 'starting'
            : 'idle'
        }
      />
      <span className="text-white font-medium">{session.projectName}</span>
      <span className="text-gray-500 text-sm font-mono truncate flex-1">{session.cwd}</span>

      {/* Editor Icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onOpenEditor('vscode', session.cwd)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-blue-400"
          title="Open in VS Code"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
          </svg>
        </button>
        <button
          onClick={() => onOpenEditor('cursor', session.cwd)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-purple-400"
          title="Open in Cursor"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </button>
        <button
          onClick={() => onOpenEditor('idea', session.cwd)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-orange-400"
          title="Open in IntelliJ IDEA"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0v24h24V0H0zm3.723 3.111h5v1.834h-1.39v6.277h1.39v1.834h-5v-1.834h1.444V4.945H3.723V3.111zm11.055 0H17v6.5c0 .612-.055 1.111-.222 1.556-.167.444-.39.778-.723 1.056-.389.333-.833.555-1.334.666a5.4 5.4 0 0 1-1.5.223c-.944 0-1.722-.167-2.333-.556-.556-.333-.834-.778-.834-1.278 0-.278.111-.5.278-.722a1.08 1.08 0 0 1 .722-.334c.278 0 .5.111.667.278.166.166.278.389.333.666.111.334.278.612.5.778.223.167.556.278 1.056.278.389 0 .722-.111 1-.389.278-.278.389-.611.389-1.111V4.945h-2.223V3.111zM3.723 19h6.945v1.834H3.723V19z" />
          </svg>
        </button>
        <button
          onClick={() => onOpenEditor('webstorm', session.cwd)}
          className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-cyan-400"
          title="Open in WebStorm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0v24h24V0H0zm2 2h20v20H2V2zm2 2v3h3V4H4zm14 0v3h3V4h-3zM7.5 6L4 12l1.5 1 2.5-4 2 3.5L8.5 14l1.5 1 2-2 2 2 1.5-1-1.5-1.5 2-3.5 2.5 4 1.5-1L16.5 6h-2L12 10.5 9.5 6h-2zM4 15v3h3v-3H4zm14 0v3h3v-3h-3z" />
          </svg>
        </button>
      </div>

      {session.gitBranch && (
        <span className="text-purple-400 text-sm">⎇ {session.gitBranch}</span>
      )}

      {/* Export Button */}
      <ExportButton
        messages={messages}
        sessionInfo={{
          projectName: session.projectName,
          cwd: session.cwd,
          gitBranch: session.gitBranch,
        }}
      />

      {/* Connect/Disconnect Button */}
      {isConnected ? (
        <button
          onClick={onDisconnect}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg font-medium transition-colors flex items-center gap-1"
          title="Disconnect"
        >
          <span className="material-icons text-sm">stop</span>
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg font-medium transition-colors flex items-center gap-1"
          title="Connect"
        >
          <span className="material-icons text-sm">play_arrow</span>
          Connect
        </button>
      )}

      <button
        onClick={onDelete}
        className="text-gray-500 hover:text-red-400 transition-colors"
        title="Delete session"
      >
        <span className="material-icons text-lg">delete</span>
      </button>
    </div>
  );
}
