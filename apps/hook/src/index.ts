#!/usr/bin/env bun
import type { Server } from 'bun';
import { spawn, spawnSync } from 'child_process';

// @ts-ignore - Import embedded HTML at build time
import html from '../dist/ui.html' with { type: 'text' };

// ============================================================================
// Types
// ============================================================================

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  stop_hook_reason?: string;
  tool_output?: string;
  error?: string;
}

interface HookResponse {
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
  suppressOutput?: boolean;
  decision?: 'block';
  reason?: string;
}

type InteractionType =
  | 'plan'
  | 'bash'
  | 'edit'
  | 'question'
  | 'stop'
  | 'subagent-stop'
  | 'post-tool'
  | 'stop-server';  // Internal: background server mode

type RiskLevel = 'safe' | 'caution' | 'dangerous';

interface Context {
  type: InteractionType;
  [key: string]: unknown;
}

interface ServerConfig {
  interactionType: InteractionType;
  hookInput: HookInput;
  onApprove: () => void;
  onDeny: (message?: string) => void;
  onAnswer?: (answers: Record<string, string | string[]>) => void;
  onAcknowledge?: () => void;
  onPlanDecision?: (decision: 'approve' | 'feedback' | 'reject', feedback?: string) => void;
  onStopDecision?: (action: 'acknowledge' | 'continue', prompt?: string) => void;
}

// ============================================================================
// Risk Assessment
// ============================================================================

const DANGEROUS_PATTERNS = [
  /\brm\s+(-[rf]+\s+)*\//,
  /\brm\s+-[rf]*\s/,
  /\bsudo\b/,
  /\bchmod\s+7[0-7][0-7]/,
  /\bchown\b/,
  /\bmkfs\b/,
  /\bdd\s/,
  /\bfdisk\b/,
  /\bparted\b/,
  /\bkill\s+-9/,
  /\bkillall\b/,
  /\bpkill\b/,
  /\breboot\b/,
  /\bshutdown\b/,
  /\binit\s+[0-6]/,
  /\bgit\s+push\s+.*--force/,
  /\bgit\s+reset\s+--hard/,
  /\bgit\s+clean\s+-[df]+/,
  /\bDROP\s+(DATABASE|TABLE)/i,
  /\bTRUNCATE\s+TABLE/i,
  /\bDELETE\s+FROM\b.*(?!WHERE)/i,
  /curl.*\|\s*(ba)?sh/,
  /wget.*\|\s*(ba)?sh/,
  /\beval\s/,
  /\bdocker\s+system\s+prune/,
  /\bkubectl\s+delete\s+namespace/,
  /\bunset\s+PATH/,
  /\bexport\s+PATH\s*=/,
  /\bshred\b/,
  /\bwipe\b/,
];

const CAUTION_PATTERNS = [
  /\brm\s/,
  /\bmv\s/,
  /\bcp\s+-[rf]/,
  /\bgit\s+push\b/,
  /\bgit\s+reset\b/,
  /\bgit\s+checkout\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+merge\b/,
  /\bgit\s+stash\s+drop/,
  /\bnpm\s+publish\b/,
  /\byarn\s+publish\b/,
  /\bdocker\s+rm\b/,
  /\bdocker\s+rmi\b/,
  /\bdocker\s+prune\b/,
  /\bkubectl\s+delete\b/,
  /\bkubectl\s+apply\b/,
  /\bkubectl\s+scale\b/,
  /\bchmod\b/,
  /\bexport\b/,
  /\bsource\b/,
  /\beval\b/,
  /\bexec\b/,
  /\bsystemctl\s+(start|stop|restart)/,
  /\bservice\s+\w+\s+(start|stop|restart)/,
];

function assessRisk(command: string): RiskLevel {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) return 'dangerous';
  }
  for (const pattern of CAUTION_PATTERNS) {
    if (pattern.test(command)) return 'caution';
  }
  return 'safe';
}

// ============================================================================
// Remote Detection
// ============================================================================

function isRemote(): boolean {
  return (
    process.env.YOURTURN_REMOTE === '1' ||
    !!process.env.SSH_TTY ||
    !!process.env.SSH_CONNECTION
  );
}

function getPort(): number {
  const envPort = process.env.YOURTURN_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
  }
  if (isRemote()) return 18765;
  return 0;
}

// ============================================================================
// Browser Opening
// ============================================================================

function openBrowser(url: string): void {
  if (isRemote()) {
    console.error(`\n🌐 Open this URL in your browser:\n   ${url}\n`);
    return;
  }

  const customBrowser = process.env.YOURTURN_BROWSER;
  if (customBrowser) {
    spawn(customBrowser, [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  const platform = process.platform;
  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    const isWSL = process.env.WSL_DISTRO_NAME ||
                  process.env.WSLENV ||
                  (process.env.PATH && process.env.PATH.includes('/mnt/c/'));
    if (isWSL) {
      command = 'cmd.exe';
      args = ['/c', 'start', '', url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
  }

  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    console.error(`\n🌐 Open this URL in your browser:\n   ${url}\n`);
  }
}

// ============================================================================
// Context Parsing
// ============================================================================

function parseContext(hookInput: HookInput, interactionType: InteractionType): Context {
  const toolInput = hookInput.tool_input || {};

  switch (interactionType) {
    case 'plan': {
      const planPath = (toolInput as any).planFile;
      let plan = '';
      if (planPath) {
        try {
          plan = require('fs').readFileSync(planPath, 'utf-8');
        } catch {
          plan = '(Could not read plan file)';
        }
      }
      return {
        type: 'plan',
        plan: plan || '(No plan content available)',
        permissionMode: hookInput.permission_mode
      };
    }

    case 'bash': {
      const command = (toolInput as any).command || '';
      return {
        type: 'bash',
        command,
        description: (toolInput as any).description,
        cwd: hookInput.cwd,
        timeout: (toolInput as any).timeout,
        riskLevel: assessRisk(command)
      };
    }

    case 'edit': {
      const filePath = (toolInput as any).file_path || '';
      const oldContent = (toolInput as any).old_string;
      const newContent = (toolInput as any).new_string || (toolInput as any).content || '';
      return {
        type: 'edit',
        filePath,
        oldContent,
        newContent,
        isNew: !oldContent && hookInput.tool_name === 'Write',
        toolName: hookInput.tool_name
      };
    }

    case 'question': {
      return {
        type: 'question',
        questions: (toolInput as any).questions || []
      };
    }

    case 'stop':
    case 'stop-server': {
      // Read transcript if available
      let transcript: string | undefined;
      if (hookInput.transcript_path) {
        try {
          transcript = require('fs').readFileSync(hookInput.transcript_path, 'utf-8');
        } catch {
          transcript = undefined;
        }
      }
      return {
        type: 'stop',
        reason: hookInput.stop_hook_reason || 'Task completed',
        sessionId: hookInput.session_id,
        cwd: hookInput.cwd,
        summary: (toolInput as any).summary,
        transcript
      };
    }

    case 'subagent-stop': {
      // Read transcript if available
      let transcript: string | undefined;
      if (hookInput.transcript_path) {
        try {
          transcript = require('fs').readFileSync(hookInput.transcript_path, 'utf-8');
        } catch {
          transcript = undefined;
        }
      }
      return {
        type: 'subagent-stop',
        subagentName: (toolInput as any).subagent_name || hookInput.tool_name || 'Subagent',
        result: (toolInput as any).result || hookInput.tool_output,
        sessionId: hookInput.session_id,
        cwd: hookInput.cwd,
        transcript
      };
    }

    case 'post-tool': {
      return {
        type: 'post-tool',
        toolName: hookInput.tool_name || 'Unknown',
        toolInput: toolInput,
        toolOutput: hookInput.tool_output,
        error: hookInput.error,
        success: !hookInput.error
      };
    }

    default:
      throw new Error(`Unknown interaction type: ${interactionType}`);
  }
}

// ============================================================================
// HTTP Server
// ============================================================================

let currentContext: Context | null = null;
let serverInstance: Server | null = null;
let config: ServerConfig | null = null;
let serverCwd: string = process.cwd();

function handleRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === '/api/context' && method === 'GET') {
    return Response.json(currentContext, { headers: corsHeaders });
  }

  if (url.pathname === '/api/approve' && method === 'POST') {
    config?.onApprove();
    cleanup();
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  if (url.pathname === '/api/deny' && method === 'POST') {
    return (async () => {
      const body = await req.json().catch(() => ({}));
      config?.onDeny((body as any).message);
      cleanup();
      return Response.json({ success: true }, { headers: corsHeaders });
    })();
  }

  if (url.pathname === '/api/answer' && method === 'POST') {
    return (async () => {
      const body = await req.json().catch(() => ({}));
      config?.onAnswer?.((body as any).answers || {});
      cleanup();
      return Response.json({ success: true }, { headers: corsHeaders });
    })();
  }

  if (url.pathname === '/api/acknowledge' && method === 'POST') {
    config?.onAcknowledge?.();
    cleanup();
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  if (url.pathname === '/api/plan-decision' && method === 'POST') {
    return (async () => {
      const body = await req.json().catch(() => ({}));
      const { decision, feedback } = body as { decision: 'approve' | 'feedback' | 'reject'; feedback?: string };
      config?.onPlanDecision?.(decision, feedback);
      cleanup();
      return Response.json({ success: true }, { headers: corsHeaders });
    })();
  }

  if (url.pathname === '/api/stop-decision' && method === 'POST') {
    return (async () => {
      const body = await req.json().catch(() => ({}));
      const { action, prompt } = body as { action: 'acknowledge' | 'continue'; prompt?: string };
      config?.onStopDecision?.(action, prompt);
      cleanup();
      return Response.json({ success: true }, { headers: corsHeaders });
    })();
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...corsHeaders
    }
  });
}

function cleanup() {
  if (serverInstance) {
    serverInstance.stop();
    serverInstance = null;
  }
  currentContext = null;
  config = null;
}

interface CreateServerResult {
  timedOut: boolean;
}

// 1 hour timeout to prevent zombie processes
async function createServer(serverConfig: ServerConfig, timeoutMs: number = 3600000): Promise<CreateServerResult> {
  config = serverConfig;
  currentContext = parseContext(serverConfig.hookInput, serverConfig.interactionType);
  serverCwd = serverConfig.hookInput.cwd || process.cwd();

  const port = getPort();
  const maxRetries = 5;
  const retryDelay = 500;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      serverInstance = Bun.serve({
        port,
        fetch: handleRequest
      });

      const actualPort = serverInstance.port;
      const url = `http://localhost:${actualPort}`;

      openBrowser(url);

      // Wait for user response OR timeout
      const result = await Promise.race([
        new Promise<CreateServerResult>((resolve) => {
          const checkInterval = setInterval(() => {
            if (!serverInstance) {
              clearInterval(checkInterval);
              resolve({ timedOut: false });
            }
          }, 100);
        }),
        new Promise<CreateServerResult>((resolve) => {
          setTimeout(() => {
            cleanup();
            resolve({ timedOut: true });
          }, timeoutMs);
        })
      ]);

      return result;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE' && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, retryDelay));
        continue;
      }
      throw error;
    }
  }

  return { timedOut: true };
}

// ============================================================================
// Stop Hook: Background Server Mode
// ============================================================================

async function runStopServer(hookInput: HookInput): Promise<void> {
  const isSubagent = hookInput.hook_event_name === 'SubagentStop';

  // Debug: log hook input to file
  try {
    const debugPath = '/tmp/maestro-debug-hook-input.json';
    require('fs').writeFileSync(debugPath, JSON.stringify(hookInput, null, 2));
  } catch {}

  await createServer({
    interactionType: isSubagent ? 'subagent-stop' : 'stop',
    hookInput,

    onApprove: () => {},
    onDeny: () => {},
    onAcknowledge: () => {
      // User acknowledged - just close the browser
    },
    onStopDecision: (action: 'acknowledge' | 'continue', prompt?: string) => {
      if (action === 'continue' && prompt) {
        // User wants to continue - run claude --continue in the original directory
        const cwd = hookInput.cwd || process.cwd();
        try {
          // Run claude --continue with the user's prompt
          const child = spawn('claude', ['--continue', prompt], {
            cwd,
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } catch (err) {
          console.error('Failed to run claude --continue:', err);
        }
      }
    }
  }, 120000); // 2 minute timeout for background server

  process.exit(0);
}

// ============================================================================
// CLI Interface
// ============================================================================

function readInput(): HookInput {
  // Read all available data from stdin synchronously
  // Works in both Bun runtime and compiled binary
  try {
    const chunks: Buffer[] = [];
    const fd = 0; // stdin
    const buf = Buffer.alloc(65536);

    // Try to read from stdin, handle both piped and TTY cases
    try {
      const fs = require('fs');
      // Check if stdin is a TTY (interactive) or pipe
      if (process.stdin.isTTY) {
        return {} as HookInput;
      }

      // Read synchronously from file descriptor
      let bytesRead: number;
      while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
        chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
      }
    } catch (e) {
      // If readSync fails, try alternative method
      const input = require('fs').readFileSync(fd, 'utf-8');
      if (!input.trim()) {
        return {} as HookInput;
      }
      return JSON.parse(input);
    }

    if (chunks.length === 0) {
      return {} as HookInput;
    }

    const input = Buffer.concat(chunks).toString('utf-8');
    if (!input.trim()) {
      return {} as HookInput;
    }
    return JSON.parse(input);
  } catch {
    return {} as HookInput;
  }
}

function getInteractionType(): InteractionType {
  const args = process.argv.slice(2);
  const type = args[0];

  const validTypes: InteractionType[] = [
    'plan', 'bash', 'edit', 'question',
    'stop', 'subagent-stop', 'post-tool', 'stop-server'
  ];

  if (!type || !validTypes.includes(type as InteractionType)) {
    console.error(`Usage: yourturn <${validTypes.join('|')}>`);
    process.exit(1);
  }

  return type as InteractionType;
}

function buildPermissionResponse(approved: boolean, message?: string): HookResponse {
  return {
    hookSpecificOutput: {
      decision: {
        behavior: approved ? 'allow' : 'deny',
        message
      }
    }
  };
}

function buildQuestionResponse(answers: Record<string, string | string[]>): HookResponse {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput: { answers }
    }
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const interactionType = getInteractionType();
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // All modes: read from file if path provided, otherwise stdin
  // This avoids stdin issues in Bun compiled binaries
  const inputFile = process.argv[3]; // Optional: temp file path
  let hookInput: HookInput;

  if (inputFile && fs.existsSync(inputFile)) {
    try {
      const content = fs.readFileSync(inputFile, 'utf-8');
      hookInput = JSON.parse(content);
      fs.unlinkSync(inputFile); // Clean up temp file
    } catch (err) {
      console.error('Failed to read hook input from file:', err);
      hookInput = {} as HookInput;
    }
  } else {
    // Fallback to stdin (may not work in compiled binary)
    hookInput = readInput();
  }

  // Background server mode (internal)
  if (interactionType === 'stop-server') {
    await runStopServer(hookInput);
    process.exit(0);
    return;
  }

  // Stop/SubagentStop hooks: spawn background server and exit immediately
  if (interactionType === 'stop' || interactionType === 'subagent-stop') {
    // Write hook input to temp file
    const tempFile = path.join(os.tmpdir(), `yourturn-${Date.now()}-${process.pid}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(hookInput));

    // Spawn background server process
    // For compiled Bun binary: process.execPath IS the binary, just pass args directly
    const child = spawn(process.execPath, ['stop-server', tempFile], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Exit immediately - allow stop
    process.exit(0);
  }

  // Other hooks: normal blocking behavior
  let response: HookResponse | null = null;

  await createServer({
    interactionType,
    hookInput,

    onApprove: () => {
      response = buildPermissionResponse(true);
    },

    onDeny: (message?: string) => {
      response = buildPermissionResponse(false, message);
    },

    onAnswer: (answers: Record<string, string | string[]>) => {
      response = buildQuestionResponse(answers);
    },

    onAcknowledge: () => {},

    onPlanDecision: (decision: 'approve' | 'feedback' | 'reject', feedback?: string) => {
      if (decision === 'approve') {
        response = buildPermissionResponse(true, feedback);
      } else if (decision === 'feedback') {
        response = buildPermissionResponse(false, feedback);
      } else {
        response = buildPermissionResponse(false, feedback || 'Plan rejected by user');
      }
    },

    onStopDecision: () => {}
  }, 300000);

  if (response) {
    console.log(JSON.stringify(response));
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
