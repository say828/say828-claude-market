/**
 * Hook input from Claude Code
 */
export interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  // Stop event fields
  stop_hook_reason?: string;
  // PostToolUse fields
  tool_output?: string;
  error?: string;
}

/**
 * Hook response to Claude Code
 */
export interface HookResponse {
  hookSpecificOutput?: {
    hookEventName?: string;
    decision?: {
      behavior: 'allow' | 'deny';
      message?: string;
      updatedInput?: Record<string, unknown>;
    };
    permissionDecision?: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
  };
  continue?: boolean;
  stopReason?: string;
}

/**
 * Interaction types
 */
export type InteractionType =
  | 'plan'
  | 'bash'
  | 'edit'
  | 'question'
  | 'stop'
  | 'subagent-stop'
  | 'post-tool';

/**
 * Plan context
 */
export interface PlanContext {
  type: 'plan';
  plan: string;
  permissionMode: string;
}

/**
 * Bash context
 */
export interface BashContext {
  type: 'bash';
  command: string;
  description?: string;
  cwd: string;
  timeout?: number;
  riskLevel: 'safe' | 'caution' | 'dangerous';
}

/**
 * Edit context
 */
export interface EditContext {
  type: 'edit';
  filePath: string;
  oldContent?: string;
  newContent: string;
  isNew: boolean;
  toolName: 'Edit' | 'Write';
}

/**
 * Question context
 */
export interface QuestionContext {
  type: 'question';
  questions: Array<{
    question: string;
    header: string;
    options: Array<{
      label: string;
      description: string;
    }>;
    multiSelect: boolean;
  }>;
}

/**
 * Stop context (task completed)
 */
export interface StopContext {
  type: 'stop';
  reason: string;
  sessionId: string;
  summary?: string;
}

/**
 * Subagent stop context
 */
export interface SubagentStopContext {
  type: 'subagent-stop';
  subagentName: string;
  result?: string;
  sessionId: string;
}

/**
 * Post tool use context
 */
export interface PostToolContext {
  type: 'post-tool';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: string;
  error?: string;
  success: boolean;
}

/**
 * All context types
 */
export type Context =
  | PlanContext
  | BashContext
  | EditContext
  | QuestionContext
  | StopContext
  | SubagentStopContext
  | PostToolContext;

/**
 * Server configuration
 */
export interface ServerConfig {
  interactionType: InteractionType;
  hookInput: HookInput;
  onApprove: () => void;
  onDeny: (message?: string) => void;
  onAnswer?: (answers: Record<string, string | string[]>) => void;
  onAcknowledge?: () => void;
}
