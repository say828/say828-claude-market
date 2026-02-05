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
claude-maestro/
├── apps/hook/              # CLI binary (Bun)
│   ├── src/index.ts        # Main CLI entry point
│   ├── hooks/hooks.json    # Hook configuration
│   └── dist/
│       ├── ui.html         # Embedded UI (copied from packages/ui/dist)
│       └── claude-maestro-*      # Compiled binaries
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
2. Spawns detached background process: `claude-maestro stop-server <tempfile>`
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
| `PermissionRequest` | `ExitPlanMode` | `claude-maestro plan` | 345600s |
| `PermissionRequest` | `Bash` | `claude-maestro bash` | 300s |
| `PermissionRequest` | `Edit\|Write` | `claude-maestro edit` | 300s |
| `PreToolUse` | `AskUserQuestion` | `claude-maestro question` | 300s |
| `Stop` | (all) | `claude-maestro stop` | 65s |
| `SubagentStop` | (all) | `claude-maestro subagent-stop` | 65s |

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

### Input Reading (File-based, NOT stdin)

**CRITICAL: Bun compiled binaries have stdin issues!**

Direct `fs.readFileSync(0)` causes compiled binaries to hang in "UE" (uninterruptible sleep) state.

**Solution**: hooks.json uses bash wrapper to pipe stdin to temp file:
```bash
bash -c 'B=~/.local/bin/claude-maestro;T=$(mktemp);cat>$T;[ -x "$B" ]&&exec "$B" bash "$T"||...'
```

Binary reads from file path argument instead of stdin:
```typescript
const inputFile = process.argv[3]; // temp file path
const content = fs.readFileSync(inputFile, 'utf-8');
```

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

## Required Testing After Every Code Change

**CRITICAL: After ANY code change, you MUST build AND replace the binary!**

### Mandatory Build & Replace Workflow

After every UI or hook code change, run this sequence:

```bash
# 1. Build release binaries
bun run build:release

# 2. Replace the installed binary (MANDATORY!)
# IMPORTANT: Must use rm -f before cp! Direct cp causes UE state issues on macOS.
rm -f ~/.local/bin/claude-maestro
cp apps/hook/dist/claude-maestro-macos-arm64 ~/.local/bin/claude-maestro
chmod +x ~/.local/bin/claude-maestro

# 3. Kill any old servers
pkill -f "stop-server" 2>/dev/null || true
```

**⚠️ DO NOT skip step 2!** Without replacing the binary, you will test the OLD version.
**⚠️ CRITICAL: Always use `rm -f` before `cp`!** Overwriting in place causes macOS to cache old binary state, resulting in UE (uninterruptible sleep) zombie processes.

### Testing Commands

```bash
# Test bash hook
echo '{"session_id":"test","cwd":"'$(pwd)'","tool_input":{"command":"ls -la"}}' | ./apps/hook/dist/claude-maestro-macos-arm64 bash

# Test stop hook (with transcript)
echo '{"session_id":"test","cwd":"'$(pwd)'","stop_hook_reason":"Task completed","transcript_path":"/tmp/test-transcript.json"}' | ./apps/hook/dist/claude-maestro-macos-arm64 stop

# Check server port
lsof -i -P | grep claude-ma | grep LISTEN
```

### Plugin Release Testing

After releasing, reinstall from marketplace:
```bash
/plugin marketplace update claude-maestro
/plugin uninstall claude-maestro@claude-maestro
/plugin install claude-maestro@claude-maestro
```

### Zombie Process Cleanup

UE state processes (32 bytes memory) are zombie processes from old corrupted binary.
They cannot be killed - require system reboot or replacing the binary at `~/.local/bin/claude-maestro`.

```bash
# Check for zombies
ps aux | grep claude-maestro | grep UE

# Replace binary to prevent new zombies (MUST use rm -f before cp!)
rm -f ~/.local/bin/claude-maestro
cp apps/hook/dist/claude-maestro-macos-arm64 ~/.local/bin/claude-maestro
chmod +x ~/.local/bin/claude-maestro
```

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

---

## Troubleshooting

### Binary Hangs (UE State)

**Symptom**: Process shows "UE" state in `ps aux`, 32 bytes memory usage

**Causes**:
1. Old corrupted binary at `~/.local/bin/claude-maestro`
2. Zombie processes from previous runs blocking new ones
3. **Most common**: Using `cp` to overwrite binary in place instead of `rm -f` then `cp` - macOS caches binary state

**Solution**:
```bash
# Kill all stuck processes (may need sudo or reboot for truly stuck ones)
pkill -9 -f claude-maestro

# Delete and recreate binary
rm -f ~/.local/bin/claude-maestro
cp apps/hook/dist/claude-maestro-macos-arm64 ~/.local/bin/claude-maestro
chmod +x ~/.local/bin/claude-maestro
```

### Plugin Hooks Not Triggering

**Symptom**: Plugin installed but hooks don't run, old behavior persists

**Causes**:
1. Empty arrays `[]` in `~/.claude/settings.json` or `~/.claude/settings.local.json` override plugin hooks
2. Old plugin version cached

**Solution**:
```bash
# Check for blocking empty arrays
cat ~/.claude/settings.json | grep -A2 "PermissionRequest\|Stop\|PreToolUse"

# Remove blocking entries (should NOT have empty arrays for hooks you want plugins to handle)
# Edit settings.json and settings.local.json to remove:
#   "PermissionRequest": [],
#   "PreToolUse": [],
#   "Stop": [],
#   "SubagentStop": []

# Clear plugin cache
rm -rf ~/.claude/plugins/cache/say828-claude-market

# Reinstall
/plugin marketplace update say828-claude-market
/plugin uninstall claude-maestro@say828-claude-market
/plugin install claude-maestro@say828-claude-market
```

### Old UI Showing

**Symptom**: Browser shows outdated UI after code changes

**Causes**:
1. Testing with cached plugin instead of local build
2. Old binary at `~/.local/bin/claude-maestro`
3. Browser cache

**Solution**:
```bash
# Always test with freshly built binary directly
bun run build:release
echo '{"test":"data"}' > /tmp/test.json
./apps/hook/dist/claude-maestro-macos-arm64 bash /tmp/test.json

# Update installed binary
cp apps/hook/dist/claude-maestro-macos-arm64 ~/.local/bin/claude-maestro

# Hard refresh browser (Cmd+Shift+R)
```

### Complete Reset Procedure

When all else fails, do a complete reset:

```bash
# 1. Kill all processes
pkill -9 -f claude-maestro || true

# 2. Remove all cached/installed files
rm -f ~/.local/bin/claude-maestro
rm -rf ~/.claude/plugins/cache/say828-claude-market

# 3. Clean settings (remove blocking hooks)
# Edit ~/.claude/settings.json - remove empty hook arrays
# Edit ~/.claude/settings.local.json - remove or empty the file

# 4. Rebuild from scratch
bun run clean
bun run build:release

# 5. Install fresh binary
cp apps/hook/dist/claude-maestro-macos-arm64 ~/.local/bin/claude-maestro
chmod +x ~/.local/bin/claude-maestro

# 6. Reinstall plugin
/plugin marketplace update say828-claude-market
/plugin install claude-maestro@say828-claude-market

# 7. Restart Claude Code session
```
