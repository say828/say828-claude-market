// Session types from Claude Code JSONL format

export interface SessionMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch?: string;
  slug?: string;
  type: 'user' | 'assistant' | 'progress' | 'system' | 'file-history-snapshot';
  message?: {
    role: 'user' | 'assistant';
    content: MessageContent[];
    model?: string;
    id?: string;
  };
  uuid: string;
  timestamp: string;
  todos?: unknown[];
  permissionMode?: string;
  requestId?: string;
  data?: ProgressData;
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface ProgressData {
  type: string;
  hookEvent?: string;
  hookName?: string;
  command?: string;
  toolName?: string;
  status?: string;
}

export interface Session {
  id: string;
  projectPath: string;
  projectName: string;
  filePath: string;
  cwd: string;
  gitBranch?: string;
  lastActivity: Date;
  messageCount: number;
  status: SessionStatus;
  pendingHook?: PendingHook;
  messages: SessionMessage[];
}

export type SessionStatus = 'active' | 'idle' | 'pending_hook';

export type HookType = 'bash' | 'edit' | 'plan' | 'question';

export interface PendingHook {
  type: HookType;
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: Date;
}

export interface ProjectSessions {
  projectPath: string;
  projectName: string;
  sessions: Session[];
}

export interface OrchestratorState {
  projects: Map<string, ProjectSessions>;
  activeSessionCount: number;
  pendingHookCount: number;
}

// API types
export interface ApiContext {
  type: 'orchestrator';
  sessions: SessionSummary[];
  stats: DashboardStats;
}

export interface SessionSummary {
  id: string;
  projectName: string;
  cwd: string;
  gitBranch?: string;
  lastActivity: string;
  messageCount: number;
  status: SessionStatus;
  lastMessage?: string;
  pendingHook?: {
    type: string;
    toolName: string;
  };
}

export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  pendingHooks: number;
  projectCount: number;
}

export interface SessionDetail {
  session: Session;
  messages: DisplayMessage[];
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolUse?: ToolUseInfo;
  toolResult?: ToolResultInfo;
}

export interface ToolUseInfo {
  id?: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultInfo {
  toolUseId?: string;
  content: string;
  isError: boolean;
}

export interface HookAlert {
  sessionId: string;
  sessionName: string;
  receivedAt?: number;
  hook: PendingHook & {
    preview?: string;
  };
}

// Notification settings
export interface NotificationSettings {
  enabledHooks: Record<HookType, boolean>;
  soundEnabled: boolean;
  soundType: 'gentle' | 'chime' | 'alert' | 'none';
  browserNotifications: boolean;
  autoDeleteMinutes: number;
}

// App settings
export interface AppSettings {
  serverUrl: string;
}

// WebSocket message types
export type WebSocketMessageType =
  | 'init'
  | 'sessions_update'
  | 'hook_alert'
  | 'web_session'
  | 'hook_notification';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data?: T;
  sessionId?: string;
}

// Web session types
export type WebSessionStatus = 'starting' | 'active' | 'waiting_permission' | 'completed' | 'error';

export interface WebSessionMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'permission_request' | 'error' | 'status';
  content?: string;
  toolUse?: ToolUseInfo;
  toolResult?: ToolResultInfo;
  permission?: {
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
  };
  status?: 'started' | 'completed' | 'error';
}

export interface ConnectedSession {
  status: WebSessionStatus;
  messages: WebSessionMessage[];
}

// API request/response types
export interface CreateWebSessionRequest {
  cwd: string;
  resumeSessionId?: string;
}

export interface CreateWebSessionResponse {
  success: boolean;
  sessionId: string;
  projectName: string;
  status?: WebSessionStatus;
  resumed?: boolean;
  error?: string;
  details?: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface ControlSignalRequest {
  signal: string;
}

export interface PermissionResponseRequest {
  toolUseId: string;
  approved: boolean;
  feedback?: string;
}

// Theme types
export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
}
