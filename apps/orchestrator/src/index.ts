#!/usr/bin/env bun
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionWatcher } from './session-watcher';
import { PluginManager } from './plugin-manager';
import * as webSession from './web-session';
import type { Session, SessionSummary, DisplayMessage, DashboardStats, PendingHook, HookAlert } from './types';
import * as configManager from './config-manager';
import { logger } from './logger';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  SessionError,
  FileSystemError,
  requireString,
  requireBoolean,
  safeWebSocketHandler
} from './error-handler';

// @ts-ignore - Import HTML as text
import html from '../dist/ui.html' with { type: 'text' };

const DEFAULT_PORT = 18700;
const PORT = parseInt(process.env.ORCHESTRATOR_PORT || '') || DEFAULT_PORT;

// WebSocket clients
const wsClients: Set<{ send: (data: string) => void }> = new Set();

// WebSocket client to web session mapping
const wsToWebSession = new Map<any, string>();

// Broadcast to specific web session subscribers
function broadcastToWebSession(sessionId: string, message: any) {
  const msgStr = JSON.stringify({ type: 'web_session', sessionId, data: message });
  for (const [ws, sid] of wsToWebSession) {
    if (sid === sessionId) {
      try {
        ws.send(msgStr);
      } catch {
        wsToWebSession.delete(ws);
      }
    }
  }
}

// Helper to generate preview text from hook input
function getHookPreview(hook: PendingHook): string {
  const input = hook.input;
  if (hook.type === 'bash' && typeof input.command === 'string') {
    return input.command.slice(0, 100);
  } else if (hook.type === 'edit' && typeof input.new_string === 'string') {
    return input.new_string.slice(0, 100);
  } else if (hook.type === 'question' && typeof input.question === 'string') {
    return input.question.slice(0, 100);
  } else if (hook.type === 'plan' && typeof input.description === 'string') {
    return input.description.slice(0, 100);
  }
  return JSON.stringify(input).slice(0, 100);
}

// Session watcher
const watcher = new SessionWatcher(
  // onUpdate callback
  (sessions) => {
    // Broadcast update to all WebSocket clients
    const message = JSON.stringify({
      type: 'sessions_update',
      data: sessions.map(sessionToSummary)
    });
    for (const client of wsClients) {
      try {
        client.send(message);
      } catch {
        wsClients.delete(client);
      }
    }
  },
  // onHookAlert callback
  (sessionId: string, sessionName: string, hook: PendingHook) => {
    // Broadcast hook alert to all WebSocket clients
    const alert: HookAlert = {
      sessionId,
      sessionName,
      hook: {
        ...hook,
        preview: getHookPreview(hook)
      }
    };
    const message = JSON.stringify({
      type: 'hook_alert',
      data: alert
    });
    for (const client of wsClients) {
      try {
        client.send(message);
      } catch {
        wsClients.delete(client);
      }
    }
  }
);

// Plugin manager
const pluginManager = new PluginManager();

// Start rate limit cleanup
rateLimiter.startCleanup();

// Log auth status
if (auth.isAuthEnabled()) {
  console.log('🔒 Authentication enabled (ORCHESTRATOR_TOKEN set)');
} else {
  console.log('⚠️  Authentication disabled (ORCHESTRATOR_TOKEN not set)');
}

function sessionToSummary(session: Session): SessionSummary {
  // Get last message text
  let lastMessage = '';
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if ((msg.type === 'user' || msg.type === 'assistant') && msg.message?.content) {
      for (const content of msg.message.content) {
        if (content.type === 'text') {
          lastMessage = content.text.slice(0, 100);
          break;
        }
      }
      if (lastMessage) break;
    }
  }

  return {
    id: session.id,
    projectName: session.projectName,
    cwd: session.cwd,
    gitBranch: session.gitBranch,
    lastActivity: session.lastActivity.toISOString(),
    messageCount: session.messageCount,
    status: session.status,
    lastMessage,
    pendingHook: session.pendingHook ? {
      type: session.pendingHook.type,
      toolName: session.pendingHook.toolName
    } : undefined
  };
}

function sessionToDisplayMessages(session: Session): DisplayMessage[] {
  const messages: DisplayMessage[] = [];

  for (const msg of session.messages) {
    if (msg.type === 'user' && msg.message?.content) {
      let text = '';
      for (const content of msg.message.content) {
        if (content.type === 'text') {
          text += content.text;
        }
      }
      if (text) {
        messages.push({
          id: msg.uuid,
          role: 'user',
          content: text,
          timestamp: msg.timestamp
        });
      }
    } else if (msg.type === 'assistant' && msg.message?.content) {
      let text = '';
      let toolUse: DisplayMessage['toolUse'];
      let toolResult: DisplayMessage['toolResult'];

      for (const content of msg.message.content) {
        if (content.type === 'text') {
          text += content.text;
        } else if (content.type === 'tool_use') {
          toolUse = {
            name: content.name,
            input: content.input
          };
        } else if (content.type === 'tool_result') {
          toolResult = {
            content: typeof content.content === 'string' ? content.content : JSON.stringify(content.content),
            isError: content.is_error || false
          };
        }
      }

      if (text || toolUse) {
        messages.push({
          id: msg.uuid,
          role: 'assistant',
          content: text,
          timestamp: msg.timestamp,
          toolUse,
          toolResult
        });
      }
    } else if (msg.type === 'system') {
      messages.push({
        id: msg.uuid,
        role: 'system',
        content: 'System message',
        timestamp: msg.timestamp
      });
    }
  }

  return messages;
}

// HTTP Server
const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Rate limiting
    const ip = rateLimiter.getClientIP(req);
    const rateLimit = rateLimiter.checkRateLimit(ip);

    // Add rate limit headers to response helper
    const addRateLimitHeaders = (response: Response): Response => {
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', '100');
      headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    };

    // Helper to create JSON response with rate limit headers
    const jsonResponse = (data: any, init?: ResponseInit): Response => {
      const response = jsonResponse(data, init);
      return addRateLimitHeaders(response);
    };

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000))
        }
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      // Check auth for WebSocket
      if (!auth.validateWebSocketAuth(req)) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Valid authentication token required for WebSocket'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return undefined;
    }

    // Authentication check (skip for root HTML page to allow token input)
    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      const authResult = auth.requireAuth(req);
      if (authResult) {
        return addRateLimitHeaders(authResult);
      }
    }

    // API routes
    if (url.pathname === '/api/sessions') {
      const sessions = watcher.getAllSessions();
      return jsonResponse({
        sessions: sessions.map(sessionToSummary),
        stats: watcher.getStats()
      });
    }

    // Web Session API - Create new session or resume existing
    if (url.pathname === '/api/web-session' && req.method === 'POST') {
      return asyncHandler(async () => {
        const { cwd, resumeSessionId } = await req.json();

        // Validate cwd
        const validCwd = requireString(cwd, 'cwd');

        // Verify directory exists
        if (!fs.existsSync(validCwd)) {
          throw new FileSystemError('Directory does not exist', { cwd: validCwd });
        }

        // Check if already have an active web session for this resume ID
        if (resumeSessionId) {
          const existing = webSession.getWebSession(resumeSessionId);
          if (existing && existing.status === 'active') {
            logger.info('Resuming existing web session', {
              context: 'WebSession',
              data: { sessionId: existing.id, cwd: validCwd }
            });
            return jsonResponse({
              success: true,
              sessionId: existing.id,
              projectName: existing.projectName,
              resumed: true
            });
          }
        }

        const session = webSession.createWebSession(validCwd, (msg) => {
          broadcastToWebSession(session.id, msg);
        }, resumeSessionId);

        await webSession.startWebSession(session, resumeSessionId);

        logger.info('Created new web session', {
          context: 'WebSession',
          data: { sessionId: session.id, cwd: validCwd }
        });

        return jsonResponse({
          success: true,
          sessionId: session.id,
          projectName: session.projectName,
          status: session.status,
          resumed: !!resumeSessionId
        });
      }, 'WebSession:Create');
    }

    // Web Session API - List active web sessions
    if (url.pathname === '/api/web-sessions') {
      const sessions = webSession.getAllWebSessions();
      return jsonResponse({
        sessions: sessions.map(s => ({
          id: s.id,
          cwd: s.cwd,
          projectName: s.projectName,
          status: s.status
        }))
      });
    }

    // Web Session API - Actions
    if (url.pathname.startsWith('/api/web-session/')) {
      const pathParts = url.pathname.replace('/api/web-session/', '').split('/');
      const sessionId = pathParts[0];
      const action = pathParts[1];

      // POST /api/web-session/:id/message - Send message
      if (action === 'message' && req.method === 'POST') {
        return asyncHandler(async () => {
          const { message } = await req.json();
          const validMessage = requireString(message, 'message');

          const success = await webSession.sendMessage(sessionId, validMessage);
          if (!success) {
            throw new SessionError('Failed to send message. Session may not be active.');
          }

          return jsonResponse({ success: true });
        }, 'WebSession:SendMessage');
      }

      // POST /api/web-session/:id/control - Send control signal (Ctrl+C, Ctrl+O, etc.)
      if (action === 'control' && req.method === 'POST') {
        return asyncHandler(async () => {
          const { signal } = await req.json();
          const success = await webSession.sendControlSignal(sessionId, signal);
          if (!success) {
            throw new SessionError('Failed to send control signal');
          }

          return jsonResponse({ success: true });
        }, 'WebSession:ControlSignal');
      }

      // POST /api/web-session/:id/permission - Respond to permission request
      if (action === 'permission' && req.method === 'POST') {
        return asyncHandler(async () => {
          const { toolUseId, approved, feedback } = await req.json();
          const validToolUseId = requireString(toolUseId, 'toolUseId');
          const validApproved = requireBoolean(approved, 'approved');

          const success = await webSession.sendPermissionResponse(sessionId, validToolUseId, validApproved, feedback);
          if (!success) {
            throw new SessionError('Failed to send permission response');
          }

          return jsonResponse({ success: true });
        }, 'WebSession:Permission');
      }

      // DELETE /api/web-session/:id - Stop session
      if (req.method === 'DELETE') {
        const success = webSession.stopWebSession(sessionId);
        if (success) {
          return jsonResponse({ success: true });
        } else {
          return jsonResponse({ error: 'Session not found' }, { status: 404 });
        }
      }

      // GET /api/web-session/:id - Get session info
      const session = webSession.getWebSession(sessionId);
      if (!session) {
        return jsonResponse({ error: 'Web session not found' }, { status: 404 });
      }
      return jsonResponse({
        id: session.id,
        cwd: session.cwd,
        projectName: session.projectName,
        status: session.status,
        pendingPermission: session.pendingPermission
      });
    }

    if (url.pathname.startsWith('/api/session/')) {
      const pathParts = url.pathname.replace('/api/session/', '').split('/');
      const sessionId = pathParts[0];

      // DELETE session
      if (req.method === 'DELETE') {
        const success = watcher.deleteSession(sessionId);
        if (!success) {
          return jsonResponse({ error: 'Session not found or could not be deleted' }, { status: 404 });
        }
        return jsonResponse({ success: true });
      }

      // GET session details
      const session = watcher.getSession(sessionId);
      if (!session) {
        return jsonResponse({ error: 'Session not found' }, { status: 404 });
      }
      return jsonResponse({
        session: sessionToSummary(session),
        messages: sessionToDisplayMessages(session)
      });
    }

    if (url.pathname === '/api/stats') {
      return jsonResponse(watcher.getStats());
    }

    // Plugin API routes
    if (url.pathname === '/api/plugins') {
      return pluginManager.getInstalledPlugins().then(plugins => jsonResponse({ plugins }));
    }

    if (url.pathname.startsWith('/api/plugins/')) {
      const pathParts = url.pathname.replace('/api/plugins/', '').split('/');
      const pluginId = decodeURIComponent(pathParts[0]);
      const action = pathParts[1];

      if (!action) {
        // GET /api/plugins/:id - Get plugin details
        return pluginManager.getPlugin(pluginId).then(plugin => {
          if (!plugin) {
            return jsonResponse({ error: 'Plugin not found' }, { status: 404 });
          }
          return jsonResponse({ plugin });
        });
      }

      // POST actions
      if (req.method === 'POST') {
        if (action === 'enable') {
          // Note: Claude Code doesn't have a built-in enable/disable feature yet
          // This would need to modify settings.json
          return jsonResponse({
            error: 'Enable/disable not yet supported',
            message: 'Claude Code does not currently support disabling installed plugins'
          }, { status: 501 });
        }

        if (action === 'disable') {
          return jsonResponse({
            error: 'Enable/disable not yet supported',
            message: 'Claude Code does not currently support disabling installed plugins'
          }, { status: 501 });
        }
      }
    }

    if (url.pathname === '/api/plugin-stats') {
      return pluginManager.getPluginStats().then(stats => jsonResponse(stats));
    }

    // Config management API routes
    if (url.pathname === '/api/config') {
      try {
        const config = configManager.getAllConfig();
        return jsonResponse(config);
      } catch (err) {
        return jsonResponse({ error: 'Failed to read config', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/settings') {
      if (req.method === 'GET') {
        try {
          const settings = configManager.getSettings();
          return jsonResponse(settings);
        } catch (err) {
          return jsonResponse({ error: 'Failed to read settings', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const settings = await req.json();
          configManager.updateSettings(settings);
          return jsonResponse({ success: true });
        } catch (err) {
          return jsonResponse({ error: 'Failed to update settings', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/settings-local') {
      if (req.method === 'GET') {
        try {
          const settings = configManager.getLocalSettings();
          return jsonResponse(settings);
        } catch (err) {
          return jsonResponse({ error: 'Failed to read local settings', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const settings = await req.json();
          configManager.updateLocalSettings(settings);
          return jsonResponse({ success: true });
        } catch (err) {
          return jsonResponse({ error: 'Failed to update local settings', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/commands') {
      try {
        const commands = configManager.getCommands();
        return jsonResponse(commands);
      } catch (err) {
        return jsonResponse({ error: 'Failed to read commands', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/hooks') {
      try {
        const hooks = configManager.getHooks();
        return jsonResponse(hooks);
      } catch (err) {
        return jsonResponse({ error: 'Failed to read hooks', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/claude-md') {
      if (req.method === 'GET') {
        try {
          const claudeMd = configManager.getClaudeMd();
          return jsonResponse(claudeMd);
        } catch (err) {
          return jsonResponse({ error: 'Failed to read CLAUDE.md', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const { content } = await req.json();
          configManager.updateClaudeMd(content);
          return jsonResponse({ success: true });
        } catch (err) {
          return jsonResponse({ error: 'Failed to update CLAUDE.md', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/config-paths') {
      try {
        const paths = configManager.getConfigPaths();
        return jsonResponse(paths);
      } catch (err) {
        return jsonResponse({ error: 'Failed to get config paths', details: String(err) }, { status: 500 });
      }
    }

    // Hook notification API (from Claude Code hooks)
    if (url.pathname === '/api/hook-notify' && req.method === 'POST') {
      try {
        const data = await req.json();
        // Broadcast to all WebSocket clients
        const message = JSON.stringify({
          type: 'hook_notification',
          data: {
            event: data.event,
            tool: data.tool,
            sessionId: data.sessionId,
            timestamp: new Date().toISOString()
          }
        });
        for (const client of wsClients) {
          try {
            client.send(message);
          } catch {
            wsClients.delete(client);
          }
        }
        return jsonResponse({ success: true });
      } catch (err) {
        return jsonResponse({ error: 'Invalid request' }, { status: 400 });
      }
    }

    // Open editor API
    if (url.pathname === '/api/open-editor' && req.method === 'POST') {
      try {
        const { editor, path: editorPath } = await req.json();
        if (!editorPath || typeof editorPath !== 'string') {
          return jsonResponse({ error: 'Path is required' }, { status: 400 });
        }

        let command: string[];
        switch (editor) {
          case 'vscode':
            command = ['code', editorPath];
            break;
          case 'cursor':
            command = ['cursor', editorPath];
            break;
          case 'idea':
            command = ['idea', editorPath];
            break;
          case 'webstorm':
            command = ['webstorm', editorPath];
            break;
          case 'fleet':
            command = ['fleet', editorPath];
            break;
          default:
            return jsonResponse({ error: 'Unknown editor' }, { status: 400 });
        }

        Bun.spawn(command, { stdio: ['ignore', 'ignore', 'ignore'] });
        return jsonResponse({ success: true });
      } catch (err) {
        return jsonResponse({ error: 'Failed to open editor', details: String(err) }, { status: 500 });
      }
    }

    // Rate limit stats API (debug endpoint)
    if (url.pathname === '/api/rate-limit-stats') {
      const stats = rateLimiter.getRateLimitStats();
      return jsonResponse(stats);
    }

    // Serve UI
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return addRateLimitHeaders(new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
    }

    return addRateLimitHeaders(new Response('Not Found', { status: 404 }));
  },
  websocket: {
    open(ws) {
      wsClients.add(ws as any);
      // Send initial data
      const sessions = watcher.getAllSessions();
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          sessions: sessions.map(sessionToSummary),
          stats: watcher.getStats()
        }
      }));
    },
    message(ws, message) {
      // Handle client messages
      safeWebSocketHandler(() => {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe_web_session') {
          // Subscribe to web session updates
          wsToWebSession.set(ws, data.sessionId);
          logger.debug('Client subscribed to web session', {
            context: 'WebSocket',
            data: { sessionId: data.sessionId }
          });
        } else if (data.type === 'unsubscribe_web_session') {
          wsToWebSession.delete(ws);
          logger.debug('Client unsubscribed from web session', {
            context: 'WebSocket'
          });
        }
      }, 'WebSocket:Message');
    },
    close(ws) {
      wsClients.delete(ws as any);
      wsToWebSession.delete(ws);
    }
  }
});

// Start watcher
watcher.start();

console.log(`🎭 Claude Orchestrator running at http://localhost:${PORT}`);
console.log('Watching Claude Code sessions...');

// Open browser
const openBrowser = (url: string) => {
  const platform = process.platform;
  const isWSL = platform === 'linux' &&
    (process.env.WSL_DISTRO_NAME || fs.existsSync('/proc/sys/fs/binfmt_misc/WSLInterop'));

  let command: string[];
  if (platform === 'darwin') {
    command = ['open', url];
  } else if (platform === 'win32') {
    command = ['cmd', '/c', 'start', '', url];
  } else if (isWSL) {
    command = ['cmd.exe', '/c', 'start', '', url];
  } else {
    command = ['xdg-open', url];
  }

  Bun.spawn(command, { stdio: ['ignore', 'ignore', 'ignore'] });
};

// Auto-open browser
if (!process.env.NO_BROWSER) {
  setTimeout(() => openBrowser(`http://localhost:${PORT}`), 500);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  watcher.stop();
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  watcher.stop();
  server.stop();
  process.exit(0);
});
