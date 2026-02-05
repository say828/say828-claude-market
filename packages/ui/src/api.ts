export interface Context {
  type: 'plan' | 'bash' | 'edit' | 'question' | 'stop' | 'subagent-stop' | 'post-tool';
  [key: string]: unknown;
}

export interface PlanContext extends Context {
  type: 'plan';
  plan: string;
  permissionMode: string;
}

export interface BashContext extends Context {
  type: 'bash';
  command: string;
  description?: string;
  cwd: string;
  timeout?: number;
  riskLevel: 'safe' | 'caution' | 'dangerous';
}

export interface EditContext extends Context {
  type: 'edit';
  filePath: string;
  oldContent?: string;
  newContent: string;
  isNew: boolean;
  toolName: 'Edit' | 'Write';
}

export interface QuestionContext extends Context {
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

export interface StopContext extends Context {
  type: 'stop';
  reason: string;
  sessionId: string;
  summary?: string;
  transcript?: string;
}

export interface SubagentStopContext extends Context {
  type: 'subagent-stop';
  subagentName: string;
  result?: string;
  sessionId: string;
  transcript?: string;
}

export interface PostToolContext extends Context {
  type: 'post-tool';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: string;
  error?: string;
  success: boolean;
}

const API_BASE = '';

export async function fetchContext(): Promise<Context> {
  const response = await fetch(`${API_BASE}/api/context`);
  if (!response.ok) {
    throw new Error('Failed to fetch context');
  }
  return response.json();
}

export async function approve(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/approve`, { method: 'POST' });
  if (!res.ok) throw new Error('Approve failed');
}

export async function deny(message?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Deny failed');
}

export async function submitAnswer(answers: Record<string, string | string[]>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  if (!res.ok) throw new Error('Submit answer failed');
}

export async function acknowledge(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/acknowledge`, { method: 'POST' });
  if (!res.ok) throw new Error('Acknowledge failed');
}
