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
  status: 'active' | 'idle' | 'pending_hook';
  pendingHook?: PendingHook;
  messages: SessionMessage[];
}

export interface PendingHook {
  type: 'bash' | 'edit' | 'plan' | 'question';
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
  status: 'active' | 'idle' | 'pending_hook';
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
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
  };
  toolResult?: {
    content: string;
    isError: boolean;
  };
}

export interface HookAlert {
  sessionId: string;
  sessionName: string;
  hook: PendingHook & {
    preview?: string; // First 100 chars of input
  };
}
