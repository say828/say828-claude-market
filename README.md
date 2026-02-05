# yourturn

Browser-based human-in-the-loop UI for Claude Code. Handles **all** interaction points through a rich web interface.

## Features

| Event | Trigger | Description |
|-------|---------|-------------|
| **Plan Review** | `ExitPlanMode` | Rich markdown rendering with syntax highlighting |
| **Bash Approval** | `Bash` | Command risk assessment (🟢 safe, 🟡 caution, 🔴 dangerous) |
| **File Edit Review** | `Edit\|Write` | Side-by-side diff view with syntax highlighting |
| **Question UI** | `AskUserQuestion` | Interactive question answering with option selection |
| **Task Complete** | `Stop` | Notification when Claude finishes working |
| **Subagent Complete** | `SubagentStop` | Notification when a subagent finishes |

## Installation

### Via Plugin Marketplace

```bash
# Add the marketplace
claude /plugin marketplace add say828/yourturn

# Install the plugin
claude /plugin install yourturn@yourturn
```

### Manual Installation

Download the latest release for your platform:

```bash
# macOS (Apple Silicon)
curl -fsSL https://github.com/say828/yourturn/releases/latest/download/yourturn-macos-arm64 -o yourturn
chmod +x yourturn
sudo mv yourturn /usr/local/bin/

# macOS (Intel)
curl -fsSL https://github.com/say828/yourturn/releases/latest/download/yourturn-macos-x64 -o yourturn
chmod +x yourturn
sudo mv yourturn /usr/local/bin/

# Linux (x64)
curl -fsSL https://github.com/say828/yourturn/releases/latest/download/yourturn-linux-x64 -o yourturn
chmod +x yourturn
sudo mv yourturn /usr/local/bin/
```

### Configure Hooks

After installation, add the hooks configuration to your Claude Code settings:

```bash
# Copy hooks.json to your Claude Code hooks directory
cp apps/hook/hooks/hooks.json ~/.claude/hooks.json
```

Or manually add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [{ "type": "command", "command": "yourturn plan", "timeout": 345600 }]
      },
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "yourturn bash", "timeout": 300 }]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "yourturn edit", "timeout": 300 }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "AskUserQuestion",
        "hooks": [{ "type": "command", "command": "yourturn question", "timeout": 300 }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "yourturn stop", "timeout": 86400 }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "yourturn subagent-stop", "timeout": 300 }]
      }
    ]
  }
}
```

## Usage

Once installed and configured, yourturn automatically intercepts Claude Code's human-in-the-loop moments:

1. **Plan Mode** - When Claude exits plan mode, a browser UI opens for plan review
2. **Bash Commands** - Before executing bash commands, review and approve in browser
3. **File Edits** - Review file changes with diff view before applying
4. **Questions** - Answer Claude's questions through an interactive UI
5. **Task Complete** - Get notified when Claude finishes a task
6. **Subagent Complete** - Get notified when a subagent finishes its work

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `YOURTURN_PORT` | Fixed port number | Random (local) or 18765 (remote) |
| `YOURTURN_REMOTE` | Force remote mode (`1`) | Auto-detect |
| `YOURTURN_BROWSER` | Custom browser command | System default |

### Remote Sessions (SSH, devcontainers)

For SSH or devcontainer sessions, yourturn automatically:
- Uses a fixed port (18765) for port forwarding
- Prints the URL instead of opening a browser

Set up port forwarding in your SSH config:

```
Host myserver
    LocalForward 18765 localhost:18765
```

## Screenshots

### Plan Review
Rich markdown rendering with syntax highlighting for implementation plans.

### Bash Command Approval
Risk indicators help you understand command safety:
- 🟢 **Safe** - Read-only or local operations
- 🟡 **Caution** - Modifies files or system state
- 🔴 **Dangerous** - May cause irreversible changes

### File Edit Review
Side-by-side diff view with syntax highlighting for 50+ languages.

### Task Complete
Get notified when Claude finishes working so you can review the results.

## Development

```bash
# Install dependencies
bun install

# Build UI
bun run build:ui

# Build hook (requires UI to be built first)
bun run build:hook

# Build everything
bun run build

# Build release binaries
bun run build:release
```

## Architecture

```
yourturn/
├── apps/hook/          # CLI binary (Bun)
│   ├── src/index.ts    # Main entry point
│   └── hooks/          # Hook configuration
├── packages/
│   ├── server/         # HTTP server library
│   └── ui/             # React SPA (Vite)
```

### How It Works

1. Claude Code triggers a hook event (e.g., `PermissionRequest` for Bash)
2. The hook calls `yourturn <type>` with the event data via stdin
3. yourturn starts an HTTP server and opens a browser to the UI
4. User reviews and approves/denies in the browser
5. yourturn returns the response to Claude Code via stdout
6. Server shuts down and browser window closes

## License

MIT License - see [LICENSE](LICENSE) for details.
