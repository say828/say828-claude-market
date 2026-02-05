# Orchestrator Skill

## What It Does

Launches the **Claude Orchestrator** browser-based UI for managing multiple Claude Code sessions.

Features:
- Real-time session monitoring
- Pending hook alerts (permissions waiting)
- Dashboard with session statistics
- Quick session switching

---

## When to Use

- When managing **multiple Claude Code sessions**
- When you need to **monitor pending hooks** across sessions
- To get an **overview of all active work**

---

## Activation

```bash
/orchestrator
```

---

## How It Works

When you invoke `/orchestrator`, Claude will:

1. Start the orchestrator server on port 18700 (or `$ORCHESTRATOR_PORT`)
2. Open your browser to `http://localhost:18700`
3. The server runs in the background

---

## Instructions for Claude

When the user invokes `/orchestrator`:

1. **Start the server** using Bash:
   ```bash
   cd /Users/say/Documents/GitHub/say828-claude-market && bun run --cwd apps/orchestrator dev &
   ```

   Or if using the installed binary:
   ```bash
   ~/.claude/plugins/cache/say828-claude-market/claude-orchestrator/*/dist/claude-orchestrator-macos-arm64 &
   ```

2. **Wait a moment** for the server to start (1-2 seconds)

3. **Open the browser**:
   ```bash
   open http://localhost:18700
   ```

4. **Confirm to user**: "Orchestrator started at http://localhost:18700"

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ORCHESTRATOR_PORT` | 18700 | Server port |
| `NO_BROWSER` | (unset) | Skip auto-opening browser |

---

## Stopping the Server

To stop the orchestrator:
```bash
pkill -f "claude-orchestrator"
# or
pkill -f "bun.*orchestrator"
```
