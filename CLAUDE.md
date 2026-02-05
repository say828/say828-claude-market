# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YourTurn is a browser-based human-in-the-loop UI system for Claude Code hooks. It intercepts Claude Code events (permission requests, stop events, questions) and provides an interactive browser UI for user approval/denial.

## Build Commands

```bash
# Install dependencies
bun install

# Build everything (UI + hook)
bun run build

# Build just the UI (produces single-file HTML)
bun run build:ui

# Build just the hook (requires UI to be built first)
bun run build:hook

# Build release binaries for all platforms
bun run build:release

# Build specific platform binary
cd apps/hook && bun run build:macos-arm64
cd apps/hook && bun run build:macos-x64
cd apps/hook && bun run build:linux-x64
cd apps/hook && bun run build:windows-x64

# Dev UI with hot reload
bun run dev:ui

# Clean all build artifacts
bun run clean
```

## Architecture

### Monorepo Structure

```
yourturn/
├── apps/hook/              # CLI binary (Bun)
│   ├── src/index.ts        # Main CLI entry point
│   ├── hooks/hooks.json    # Hook configuration
│   └── dist/
│       ├── ui.html         # Embedded UI (copied from packages/ui/dist)
│       └── yourturn-*      # Compiled binaries
├── packages/
│   ├── ui/                 # React UI (Vite + single-file HTML)
│   │   ├── src/
│   │   │   ├── App.tsx             # Main router
│   │   │   ├── api.ts              # API client for /api/* endpoints
│   │   │   ├── views/              # One view per interaction type
│   │   │   └── components/         # Shared UI components
│   │   └── vite.config.ts          # Uses vite-plugin-singlefile
│   └── server/             # Server type definitions (minimal)
```

### Hook CLI (`apps/hook/src/index.ts`)

Single-file CLI (647 lines) that orchestrates the entire flow:

1. **Receives input**: Reads JSON from stdin (synchronous via `fs.readFileSync(0)`)
2. **Starts HTTP server**: Bun.serve() with embedded UI
3. **Opens browser**: Platform-aware browser opening (macOS/Linux/Windows/WSL)
4. **Waits for response**: Polling loop checks if server is still running
5. **Returns response**: Outputs JSON to stdout and exits

**Interaction Types:**
- `plan` - ExitPlanMode approval with markdown rendering
- `bash` - Bash command approval with risk assessment (safe/caution/dangerous)
- `edit` - File Write/Edit approval with diff view
- `question` - AskUserQuestion response with option selection
- `stop` - Task completion notification (spawns background server, exits immediately)
- `subagent-stop` - Subagent completion notification (spawns background server, exits immediately)
- `stop-server` - Internal mode for background server process

**Stop Hook Behavior (Critical):**

Stop and SubagentStop hooks use a special flow to comply with Claude Code's timeout requirements:

1. Main process writes hook input to temp file
2. Spawns detached background process: `yourturn stop-server <tempfile>`
3. Main process exits 0 immediately (allows stop to proceed)
4. Background process runs server and opens browser
5. User can acknowledge or continue with new prompt

Exit codes follow Claude Code stop hook semantics:
- Exit 0 with no output = allow stop
- Exit 0 with JSON `{"decision": "block", "reason": "..."}` = block stop, continue

### Hook Configuration (`apps/hook/hooks/hooks.json`)

Maps Claude Code events to CLI commands:

| Event | Matcher | Command | Timeout |
|-------|---------|---------|---------|
| `PermissionRequest` | `ExitPlanMode` | `yourturn plan` | 345600s |
| `PermissionRequest` | `Bash` | `yourturn bash` | 300s |
| `PermissionRequest` | `Edit\|Write` | `yourturn edit` | 300s |
| `PreToolUse` | `AskUserQuestion` | `yourturn question` | 300s |
| `Stop` | (all) | `yourturn stop` | 65s |
| `SubagentStop` | (all) | `yourturn subagent-stop` | 65s |

### UI Structure (`packages/ui/src/`)

- **App.tsx**: Main router that fetches context and renders appropriate view
- **api.ts**: API client for `/api/context`, `/api/approve`, `/api/deny`, etc.
- **views/**: One view per interaction type (PlanView, BashView, EditView, QuestionView, StopView, SubagentStopView, PostToolView)
- **components/**: Shared components (Header, ActionButtons, ThemeToggle, Loading, ErrorDisplay)

The UI is built as a single-file HTML (via vite-plugin-singlefile) that gets embedded into the CLI binary at build time.

### HTTP Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Serves embedded UI HTML |
| `/api/context` | GET | Returns current interaction context |
| `/api/approve` | POST | Approve action (plan/bash/edit) |
| `/api/deny` | POST | Deny action with optional message |
| `/api/answer` | POST | Submit question answers |
| `/api/acknowledge` | POST | Acknowledge completion (stop/subagent-stop) |
| `/api/plan-decision` | POST | Plan approval (approve/feedback/reject) |
| `/api/stop-decision` | POST | Stop decision (acknowledge/continue) |

### Risk Assessment

Bash commands are classified into three risk levels based on regex patterns:

- **dangerous** (🔴): `rm -rf /`, `sudo`, `DROP DATABASE`, `git push --force`, `chmod 777`, `eval`, etc.
- **caution** (🟡): `git push`, `npm publish`, `docker rm`, `chmod`, `systemctl`, etc.
- **safe** (🟢): All other commands

See `DANGEROUS_PATTERNS` and `CAUTION_PATTERNS` arrays in `apps/hook/src/index.ts:77-135`.

## Key Implementation Details

### Build Process

1. UI is built first: `vite build` produces single-file `packages/ui/dist/index.html`
2. Hook prebuild copies UI to `apps/hook/dist/ui.html`
3. Hook build imports UI as text: `import html from '../dist/ui.html' with { type: 'text' }`
4. Bun compiles to standalone binary with embedded UI

### Synchronous stdin Reading

Bun compiled binaries require synchronous stdin reading:
```typescript
const input = fs.readFileSync(0, 'utf-8');
```
This is critical for Claude Code hook compatibility.

### Browser Opening

Platform-aware browser opening logic (`apps/hook/src/index.ts:175-215`):
- **macOS**: `open <url>`
- **Windows**: `cmd /c start "" <url>`
- **Linux**: `xdg-open <url>`
- **WSL**: `cmd.exe /c start "" <url>`
- **Remote (SSH)**: Prints URL instead of opening browser

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `YOURTURN_PORT` | Fixed port number | Random (local) or 18765 (remote) |
| `YOURTURN_REMOTE` | Force remote mode (`1`) | Auto-detect via `$SSH_TTY` |
| `YOURTURN_BROWSER` | Custom browser command | System default |

### Remote Detection

Remote mode is detected via:
- `YOURTURN_REMOTE=1` environment variable
- `SSH_TTY` environment variable (set by SSH)
- `SSH_CONNECTION` environment variable (set by SSH)

When remote, uses fixed port 18765 for SSH port forwarding and prints URL instead of opening browser.

## Required Testing Before Release

**IMPORTANT: Every code change MUST go through all three testing phases:**

### 0. Check Cache Version (CRITICAL)

**Always verify you're testing the latest build, NOT cached versions!**

```bash
# Check installed plugin cache location
cat ~/.claude/plugins/installed_plugins.json | grep yourturn

# The running yourturn binary comes from cache, NOT your local build!
# Cache location: ~/.claude/plugins/cache/yourturn/...

# To test local changes, use the built binary directly (Step 2)
# OR release and reinstall the plugin (Step 3)
```

### 1. Build Test
```bash
bun run build
bun run build:release  # Build platform binaries
```
Verify build completes without errors.

### 2. Local Binary Test
Test the built binary directly (bypasses cache):
```bash
# Test bash hook
echo '{"session_id":"test","cwd":"'$(pwd)'","tool_input":{"command":"ls -la"}}' | ./apps/hook/dist/yourturn-macos-arm64 bash

# Test stop hook
echo '{"session_id":"test","cwd":"'$(pwd)'","stop_hook_reason":"Task completed"}' | ./apps/hook/dist/yourturn-macos-arm64 stop

# Test with transcript
echo '{"session_id":"test","cwd":"'$(pwd)'","stop_hook_reason":"Done","transcript_path":"/path/to/transcript.json"}' | ./apps/hook/dist/yourturn-macos-arm64 stop
```

### 3. Install & Test
After releasing, install from marketplace and test in a real Claude Code session:
```bash
# Update marketplace
/plugin marketplace update yourturn

# Reinstall plugin (clears cache)
/plugin uninstall yourturn@yourturn
/plugin install yourturn@yourturn

# Test in real session - trigger each hook type
```

**DO NOT release without completing all three testing phases.**
**DO NOT test with cached plugin when verifying local changes.**

---

## Development Tips

### Adding a New Interaction Type

1. Add type to `InteractionType` union in `apps/hook/src/index.ts:45`
2. Add case to `parseContext()` in `apps/hook/src/index.ts:221`
3. Create new view component in `packages/ui/src/views/`
4. Add route case to `App.tsx` router
5. Update hooks.json configuration

### Testing Hook Behavior

To test hook behavior without Claude Code, pipe JSON to stdin:
```bash
echo '{"session_id":"test","cwd":"'$(pwd)'","tool_input":{"command":"ls -la"}}' | bun run apps/hook/src/index.ts bash
```

### UI Development

Run UI in dev mode with hot reload:
```bash
bun run dev:ui
```

Mock API responses by modifying fetch calls in `packages/ui/src/api.ts` or running a local mock server.
