import { spawn, type Subprocess } from 'bun';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

export interface WebSessionMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'permission_request' | 'error' | 'status';
  content?: string;
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  toolResult?: {
    toolUseId: string;
    content: string;
    isError?: boolean;
  };
  permission?: {
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
  };
  status?: 'started' | 'completed' | 'error';
}

export interface WebSession {
  id: string;
  cwd: string;
  projectName: string;
  process: Subprocess<'pipe', 'pipe', 'pipe'> | null;
  status: 'starting' | 'active' | 'waiting_permission' | 'completed' | 'error';
  pendingPermission?: {
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
  };
  onMessage: (msg: WebSessionMessage) => void;
  buffer: string;
}

const sessions = new Map<string, WebSession>();

export function createWebSession(
  cwd: string,
  onMessage: (msg: WebSessionMessage) => void,
  resumeSessionId?: string // Optional: resume existing session
): WebSession {
  // If resuming, use the existing session ID; otherwise create new
  const id = resumeSessionId || crypto.randomUUID();
  const projectName = path.basename(cwd);

  const session: WebSession = {
    id,
    cwd,
    projectName,
    process: null,
    status: 'starting',
    onMessage,
    buffer: ''
  };

  sessions.set(id, session);
  return session;
}

export async function startWebSession(session: WebSession, resumeSessionId?: string): Promise<void> {
  try {
    // Build command args
    const args = ['claude', '-p', '--output-format', 'stream-json', '--input-format', 'stream-json', '--verbose'];

    // Add --resume if resuming existing session
    if (resumeSessionId) {
      args.splice(1, 0, '--resume', resumeSessionId);
    }

    // Start claude with stream-json output format
    const proc = spawn(args, {
      cwd: session.cwd,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        CLAUDE_CODE_ENTRY_POINT: 'web-orchestrator'
      }
    });

    session.process = proc;
    session.status = 'active';

    session.onMessage({ type: 'status', status: 'started' });

    // Handle stdout (JSON stream)
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();

    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          session.buffer += text;

          // Process complete JSON lines
          const lines = session.buffer.split('\n');
          session.buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              handleStreamEvent(session, data);
            } catch (e) {
              console.error('Failed to parse stream event:', line, e);
            }
          }
        }
      } catch (err) {
        console.error('Stream read error:', err);
      }
    };

    readStream();

    // Handle stderr
    const stderrReader = proc.stderr.getReader();
    const readStderr = async () => {
      try {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          console.error('[claude stderr]', text);
        }
      } catch (err) {
        console.error('Stderr read error:', err);
      }
    };
    readStderr();

    // Handle process exit
    proc.exited.then((code) => {
      session.status = code === 0 ? 'completed' : 'error';
      session.onMessage({
        type: 'status',
        status: code === 0 ? 'completed' : 'error',
        content: `Process exited with code ${code}`
      });
      sessions.delete(session.id);
    });

  } catch (err) {
    session.status = 'error';
    session.onMessage({
      type: 'error',
      content: `Failed to start Claude: ${err instanceof Error ? err.message : String(err)}`
    });
  }
}

function handleStreamEvent(session: WebSession, data: any) {
  // Handle different event types from claude stream-json output
  switch (data.type) {
    case 'assistant':
      // Assistant message with content
      if (data.message?.content) {
        for (const block of data.message.content) {
          if (block.type === 'text') {
            session.onMessage({ type: 'text', content: block.text });
          } else if (block.type === 'tool_use') {
            session.onMessage({
              type: 'tool_use',
              toolUse: {
                id: block.id,
                name: block.name,
                input: block.input
              }
            });
          } else if (block.type === 'tool_result') {
            session.onMessage({
              type: 'tool_result',
              toolResult: {
                toolUseId: block.tool_use_id,
                content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                isError: block.is_error
              }
            });
          }
        }
      }
      break;

    case 'content_block_delta':
      if (data.delta?.type === 'text_delta') {
        session.onMessage({ type: 'text', content: data.delta.text });
      }
      break;

    case 'content_block_start':
      // Content block starting - typically indicates new content coming
      if (data.content_block?.type === 'text') {
        // Text block starting
      } else if (data.content_block?.type === 'tool_use') {
        session.onMessage({
          type: 'tool_use',
          toolUse: {
            id: data.content_block.id,
            name: data.content_block.name,
            input: data.content_block.input || {}
          }
        });
      }
      break;

    case 'content_block_stop':
      // Content block finished
      break;

    case 'message_start':
      // New message starting - session is receiving data
      session.status = 'active';
      break;

    case 'message_delta':
      // Message update (e.g., stop_reason)
      break;

    case 'message_stop':
      // Message complete
      break;

    case 'result':
      // Final result
      if (data.result) {
        session.onMessage({ type: 'text', content: data.result });
      }
      if (data.is_error) {
        session.onMessage({ type: 'error', content: data.result || 'Unknown error' });
      }
      break;

    case 'system':
      // System messages (init, session info, etc.)
      if (data.subtype === 'init' || data.subtype === 'session_start') {
        session.status = 'active';
      }
      break;

    case 'user':
      // Echo of user message
      break;

    case 'error':
      session.onMessage({ type: 'error', content: data.error?.message || data.message || 'Unknown error' });
      break;

    default:
      // Log unknown event types for debugging
      console.log('[stream event]', data.type, JSON.stringify(data).slice(0, 200));
  }
}

export async function sendMessage(sessionId: string, message: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session || !session.process || session.status !== 'active') {
    return false;
  }

  try {
    // Send message as JSON using Bun's stdin.write()
    const payload = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: message }
    }) + '\n';

    session.process.stdin.write(payload);
    session.process.stdin.flush();
    return true;
  } catch (err) {
    console.error('Failed to send message:', err);
    return false;
  }
}

export async function sendPermissionResponse(
  sessionId: string,
  toolUseId: string,
  approved: boolean,
  feedback?: string
): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session || !session.process) {
    return false;
  }

  try {
    // Send permission response using Bun's stdin.write()
    const payload = JSON.stringify({
      type: 'permission_response',
      tool_use_id: toolUseId,
      approved,
      feedback
    }) + '\n';

    session.process.stdin.write(payload);
    session.process.stdin.flush();

    if (session.status === 'waiting_permission') {
      session.status = 'active';
      session.pendingPermission = undefined;
    }

    return true;
  } catch (err) {
    console.error('Failed to send permission response:', err);
    return false;
  }
}

// Send control signal to session (Ctrl+C, Ctrl+O, etc.)
export async function sendControlSignal(sessionId: string, signal: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session || !session.process) {
    return false;
  }

  try {
    // Map signal names to control characters
    const controlChars: Record<string, string> = {
      'interrupt': '\x03',      // Ctrl+C
      'expand': '\x0F',         // Ctrl+O
      'retry': '\x12',          // Ctrl+R
      'quit': '\x1C',           // Ctrl+\
      'clear': '\x0C',          // Ctrl+L
      'eof': '\x04',            // Ctrl+D
    };

    const char = controlChars[signal];
    if (char) {
      session.process.stdin.write(char);
      session.process.stdin.flush();
      return true;
    }

    // For slash commands, send as regular message
    if (signal.startsWith('/')) {
      session.process.stdin.write(JSON.stringify({
        type: 'user',
        message: { role: 'user', content: signal }
      }) + '\n');
      session.process.stdin.flush();
      return true;
    }

    return false;
  } catch (err) {
    console.error('Failed to send control signal:', err);
    return false;
  }
}

export function stopWebSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  if (session.process) {
    session.process.kill();
  }
  sessions.delete(sessionId);
  return true;
}

export function getWebSession(sessionId: string): WebSession | undefined {
  return sessions.get(sessionId);
}

export function getAllWebSessions(): WebSession[] {
  return Array.from(sessions.values());
}
