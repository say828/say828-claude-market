import type { Server } from 'bun';
import { getPort } from './remote';
import { openBrowser } from './browser';
import { assessRisk } from './risk';
import type {
  ServerConfig,
  Context,
  HookInput,
  PlanContext,
  BashContext,
  EditContext,
  QuestionContext,
  StopContext,
  SubagentStopContext,
  PostToolContext
} from './types';

let currentContext: Context | null = null;
let serverInstance: Server | null = null;
let config: ServerConfig | null = null;
let htmlContent: string = '';

/**
 * Parse hook input into context based on interaction type
 */
function parseContext(hookInput: HookInput, interactionType: string): Context {
  const toolInput = hookInput.tool_input || {};

  switch (interactionType) {
    case 'plan': {
      // Read plan from transcript or tool input
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
      } satisfies PlanContext;
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
      } satisfies BashContext;
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
        toolName: hookInput.tool_name as 'Edit' | 'Write'
      } satisfies EditContext;
    }

    case 'question': {
      const questions = (toolInput as any).questions || [];
      return {
        type: 'question',
        questions
      } satisfies QuestionContext;
    }

    case 'stop': {
      return {
        type: 'stop',
        reason: hookInput.stop_hook_reason || 'Task completed',
        sessionId: hookInput.session_id,
        summary: (toolInput as any).summary
      } satisfies StopContext;
    }

    case 'subagent-stop': {
      return {
        type: 'subagent-stop',
        subagentName: (toolInput as any).subagent_name || hookInput.tool_name || 'Subagent',
        result: (toolInput as any).result || hookInput.tool_output,
        sessionId: hookInput.session_id
      } satisfies SubagentStopContext;
    }

    case 'post-tool': {
      return {
        type: 'post-tool',
        toolName: hookInput.tool_name || 'Unknown',
        toolInput: toolInput,
        toolOutput: hookInput.tool_output,
        error: hookInput.error,
        success: !hookInput.error
      } satisfies PostToolContext;
    }

    default:
      throw new Error(`Unknown interaction type: ${interactionType}`);
  }
}

/**
 * Handle HTTP requests
 */
function handleRequest(req: Request): Response {
  const url = new URL(req.url);
  const method = req.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // API routes
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

  // Serve SPA
  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...corsHeaders
    }
  });
}

/**
 * Cleanup server
 */
function cleanup() {
  if (serverInstance) {
    serverInstance.stop();
    serverInstance = null;
  }
  currentContext = null;
  config = null;
}

/**
 * Create and start the server
 */
export async function createServer(serverConfig: ServerConfig, html: string): Promise<void> {
  config = serverConfig;
  htmlContent = html;
  currentContext = parseContext(serverConfig.hookInput, serverConfig.interactionType);

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

      // Wait for response (server will be stopped by API call)
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!serverInstance) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      return;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE' && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, retryDelay));
        continue;
      }
      throw error;
    }
  }
}
