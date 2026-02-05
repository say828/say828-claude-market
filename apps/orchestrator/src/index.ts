#!/usr/bin/env bun
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionWatcher } from './session-watcher';
import { PluginManager } from './plugin-manager';
import type { Session, SessionSummary, DisplayMessage, DashboardStats, PendingHook, HookAlert } from './types';
import * as configManager from './config-manager';

// @ts-ignore - Import HTML as text
import html from '../dist/ui.html' with { type: 'text' };

const DEFAULT_PORT = 18700;
const PORT = parseInt(process.env.ORCHESTRATOR_PORT || '') || DEFAULT_PORT;

// WebSocket clients
const wsClients: Set<{ send: (data: string) => void }> = new Set();

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

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return undefined;
    }

    // API routes
    if (url.pathname === '/api/sessions') {
      const sessions = watcher.getAllSessions();
      return Response.json({
        sessions: sessions.map(sessionToSummary),
        stats: watcher.getStats()
      });
    }

    if (url.pathname.startsWith('/api/session/')) {
      const sessionId = url.pathname.replace('/api/session/', '');

      // DELETE session
      if (req.method === 'DELETE') {
        const success = watcher.deleteSession(sessionId);
        if (!success) {
          return Response.json({ error: 'Session not found or could not be deleted' }, { status: 404 });
        }
        return Response.json({ success: true });
      }

      // GET session details
      const session = watcher.getSession(sessionId);
      if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }
      return Response.json({
        session: sessionToSummary(session),
        messages: sessionToDisplayMessages(session)
      });
    }

    if (url.pathname === '/api/stats') {
      return Response.json(watcher.getStats());
    }

    // Plugin API routes
    if (url.pathname === '/api/plugins') {
      return pluginManager.getInstalledPlugins().then(plugins => Response.json({ plugins }));
    }

    if (url.pathname.startsWith('/api/plugins/')) {
      const pathParts = url.pathname.replace('/api/plugins/', '').split('/');
      const pluginId = decodeURIComponent(pathParts[0]);
      const action = pathParts[1];

      if (!action) {
        // GET /api/plugins/:id - Get plugin details
        return pluginManager.getPlugin(pluginId).then(plugin => {
          if (!plugin) {
            return Response.json({ error: 'Plugin not found' }, { status: 404 });
          }
          return Response.json({ plugin });
        });
      }

      // POST actions
      if (req.method === 'POST') {
        if (action === 'enable') {
          // Note: Claude Code doesn't have a built-in enable/disable feature yet
          // This would need to modify settings.json
          return Response.json({
            error: 'Enable/disable not yet supported',
            message: 'Claude Code does not currently support disabling installed plugins'
          }, { status: 501 });
        }

        if (action === 'disable') {
          return Response.json({
            error: 'Enable/disable not yet supported',
            message: 'Claude Code does not currently support disabling installed plugins'
          }, { status: 501 });
        }
      }
    }

    if (url.pathname === '/api/plugin-stats') {
      return pluginManager.getPluginStats().then(stats => Response.json(stats));
    }

    // Config management API routes
    if (url.pathname === '/api/config') {
      try {
        const config = configManager.getAllConfig();
        return Response.json(config);
      } catch (err) {
        return Response.json({ error: 'Failed to read config', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/settings') {
      if (req.method === 'GET') {
        try {
          const settings = configManager.getSettings();
          return Response.json(settings);
        } catch (err) {
          return Response.json({ error: 'Failed to read settings', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const settings = await req.json();
          configManager.updateSettings(settings);
          return Response.json({ success: true });
        } catch (err) {
          return Response.json({ error: 'Failed to update settings', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/settings-local') {
      if (req.method === 'GET') {
        try {
          const settings = configManager.getLocalSettings();
          return Response.json(settings);
        } catch (err) {
          return Response.json({ error: 'Failed to read local settings', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const settings = await req.json();
          configManager.updateLocalSettings(settings);
          return Response.json({ success: true });
        } catch (err) {
          return Response.json({ error: 'Failed to update local settings', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/commands') {
      try {
        const commands = configManager.getCommands();
        return Response.json(commands);
      } catch (err) {
        return Response.json({ error: 'Failed to read commands', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/hooks') {
      try {
        const hooks = configManager.getHooks();
        return Response.json(hooks);
      } catch (err) {
        return Response.json({ error: 'Failed to read hooks', details: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/api/claude-md') {
      if (req.method === 'GET') {
        try {
          const claudeMd = configManager.getClaudeMd();
          return Response.json(claudeMd);
        } catch (err) {
          return Response.json({ error: 'Failed to read CLAUDE.md', details: String(err) }, { status: 500 });
        }
      } else if (req.method === 'POST') {
        try {
          const { content } = await req.json();
          configManager.updateClaudeMd(content);
          return Response.json({ success: true });
        } catch (err) {
          return Response.json({ error: 'Failed to update CLAUDE.md', details: String(err) }, { status: 500 });
        }
      }
    }

    if (url.pathname === '/api/config-paths') {
      try {
        const paths = configManager.getConfigPaths();
        return Response.json(paths);
      } catch (err) {
        return Response.json({ error: 'Failed to get config paths', details: String(err) }, { status: 500 });
      }
    }

    // Serve UI
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
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
      // Handle client messages if needed
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe_session') {
          // Could implement per-session subscriptions
        }
      } catch {}
    },
    close(ws) {
      wsClients.delete(ws as any);
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
