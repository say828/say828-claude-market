# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Orchestrator is a browser-based multi-session management UI for Claude Code. It provides:
- Real-time monitoring of all Claude Code sessions
- Hook notifications with customizable alerts (sound, per-type filtering)
- Plugin management and browsing
- Claude Code settings management through a web UI
- Dashboard with session statistics

## Build Commands

```bash
# Install dependencies
bun install

# Build everything (UI + server)
bun run build

# Build release binaries for all platforms
bun run build:release

# Dev mode (runs server)
bun run dev

# Dev UI only (Vite dev server with hot reload)
bun run dev:ui

# Clean all build artifacts
bun run clean
```

## Architecture

### Monorepo Structure

```
claude-orchestrator/
├── apps/orchestrator/           # Main server binary (Bun)
│   ├── src/
│   │   ├── index.ts            # Main server entry point
│   │   ├── session-watcher.ts  # File system watcher for sessions
│   │   ├── config-manager.ts   # Claude Code settings management
│   │   ├── plugin-manager.ts   # Plugin management
│   │   └── types.ts            # Type definitions
│   └── dist/
│       ├── ui.html             # Embedded UI (from packages/orchestrator-ui)
│       └── claude-orchestrator-* # Compiled binaries
├── packages/orchestrator-ui/    # React UI (Vite + single-file HTML)
│   └── src/
│       ├── App.tsx             # Main app with tabs
│       ├── views/
│       │   ├── PluginsView.tsx     # Plugin management
│       │   └── SettingsView.tsx    # Settings management
│       └── index.css           # Tailwind styles
```

### Core Features

#### 1. Session Monitoring
- Watches `~/.claude/projects/` for session JSONL files
- Real-time updates via WebSocket
- Shows session status: active (green), idle (gray), pending_hook (yellow pulsing)
- Displays message history, tool usage, and timestamps

#### 2. Hook Notifications
- Detects new hooks in real-time (bash, edit, plan, question)
- Slide-in notification panel from right side
- Audio notification using Web Audio API (configurable)
- Per-hook-type filtering (enable/disable each type)
- Settings persist to localStorage

#### 3. Plugin Management
- Lists installed plugins from `~/.claude/plugins/`
- Shows plugin hooks, commands, metadata, keywords
- Plugin statistics (total, enabled, with hooks, with commands)
- Two-panel layout with detail view

#### 4. Settings Management
- Edit `~/.claude/settings.json` (synced settings)
- Edit `~/.claude/settings.local.json` (machine-specific)
- View custom commands from `~/.claude/commands/`
- View custom hooks from `~/.claude/hooks/`
- Edit `~/.claude/CLAUDE.md` with live preview

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Serves embedded UI HTML |
| `/ws` | WebSocket | Real-time session/hook updates |
| `/api/sessions` | GET | List all sessions with stats |
| `/api/session/:id` | GET | Get session details and messages |
| `/api/stats` | GET | Dashboard statistics |
| `/api/plugins` | GET | List installed plugins |
| `/api/plugins/:id` | GET | Get plugin details |
| `/api/plugin-stats` | GET | Plugin statistics |
| `/api/config` | GET | All config at once |
| `/api/settings` | GET/POST | Main settings.json |
| `/api/settings-local` | GET/POST | Local settings.local.json |
| `/api/commands` | GET | Custom commands list |
| `/api/hooks` | GET | Custom hooks list |
| `/api/claude-md` | GET/POST | CLAUDE.md content |
| `/api/config-paths` | GET | Config file paths |

### WebSocket Events

| Event Type | Direction | Purpose |
|------------|-----------|---------|
| `init` | Server→Client | Initial sessions and stats |
| `sessions_update` | Server→Client | Session list changed |
| `hook_alert` | Server→Client | New hook detected |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ORCHESTRATOR_PORT` | Server port | 18700 |
| `NO_BROWSER` | Don't auto-open browser | (unset) |

## Claude Code Session Format

Sessions are stored in `~/.claude/projects/<project-path>/` as JSONL files:

```json
{
  "type": "user|assistant|progress|system",
  "sessionId": "uuid",
  "message": {
    "role": "user|assistant",
    "content": [
      {"type": "text", "text": "..."},
      {"type": "tool_use", "id": "...", "name": "Bash", "input": {...}},
      {"type": "tool_result", "tool_use_id": "...", "content": "..."}
    ]
  },
  "timestamp": "ISO8601",
  "uuid": "message-uuid",
  "parentUuid": "parent-message-uuid"
}
```

## Development

### Running Locally

```bash
# Build and run
bun run build
./apps/orchestrator/dist/claude-orchestrator-macos-arm64

# Or use dev mode
bun run dev
```

### Testing API

```bash
# Get stats
curl http://localhost:18700/api/stats

# Get sessions
curl http://localhost:18700/api/sessions

# Get plugins
curl http://localhost:18700/api/plugins
```

### Adding New Features

1. **New API Endpoint**: Add to `apps/orchestrator/src/index.ts` in the fetch handler
2. **New UI View**: Create in `packages/orchestrator-ui/src/views/`
3. **New Tab**: Update `App.tsx` with new TabType and conditional render

### Build Process

1. UI is built first: `vite build` produces single-file HTML via vite-plugin-singlefile
2. Server prebuild copies UI: `cp packages/orchestrator-ui/dist/index.html apps/orchestrator/dist/ui.html`
3. Server build imports UI as text: `import html from '../dist/ui.html' with { type: 'text' }`
4. Bun compiles to standalone binary with embedded UI

## Key Implementation Details

### Session Watcher

The `SessionWatcher` class:
- Uses `fs.watch` for directory changes
- Polls session files every 1 second for content changes
- Tracks file positions for incremental reads
- Detects pending hooks by finding tool_use without tool_result
- Emits `onUpdate` when sessions change
- Emits `onHookAlert` when new hooks are detected

### Hook Detection

A hook is considered "pending" when:
1. A `tool_use` block exists with name in `['Bash', 'Edit', 'Write', 'AskUserQuestion']`
2. No corresponding `tool_result` block exists (matched by tool_use_id)

### Plugin Manager

The `PluginManager` class:
- Reads `~/.claude/plugins/installed_plugins.json`
- Parses plugin manifests from `.claude-plugin/plugin.json`
- Extracts hooks from multiple locations (hooks.json, .claude-plugin/hooks.json)
- Parses Claude Code's nested hook format (event type → matchers → commands)

### Config Manager

Provides functions to:
- Read/write settings files with JSON parsing
- List custom commands and hooks as file paths
- Handle CLAUDE.md as plain text
