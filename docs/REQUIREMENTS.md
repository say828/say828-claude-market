# yourturn - Requirements & Design Document

## Overview

yourturn is a Claude Code plugin that handles ALL human-in-the-loop moments via browser UI, not just plan mode.

## Problem Statement

Claude Code requires human approval for various actions, but the CLI interface is limited:
- Plan mode approval is text-only
- Bash command approval lacks context visualization
- File edit approval doesn't show proper diffs
- Question dialogs are basic text prompts

**yourturn** provides rich browser-based UI for ALL these interaction points.

## Core Features

### 1. Plan Approval (`ExitPlanMode`)
- Rich markdown rendering with syntax highlighting
- Annotation support for feedback
- Approve/Deny with detailed comments
- Share plans via URL

### 2. Bash Command Approval (`PermissionRequest` + `Bash` matcher)
- Command syntax highlighting
- Risk level indicators (🟢 safe, 🟡 caution, 🔴 dangerous)
- Command explanation via AI
- Working directory context
- History of recent commands

### 3. File Edit Approval (`PermissionRequest` + `Edit|Write` matcher)
- Side-by-side diff view
- Syntax highlighting for 50+ languages
- Line-by-line review
- File tree context
- Bulk approve/deny for multiple edits

### 4. Question Response (`PreToolUse` + `AskUserQuestion` matcher)
- Rich question display
- Option selection with descriptions
- Custom input support
- Multi-select handling
- Response validation

## Technical Architecture

### Tech Stack
- **Runtime**: Bun 1.0+
- **UI Framework**: React 19
- **Styling**: Tailwind CSS 4
- **Build**: Vite with single-file plugin
- **Syntax Highlighting**: highlight.js
- **Diff Rendering**: @pierre/diffs
- **Markdown**: marked + mermaid

### Project Structure
```
yourturn/
├── apps/
│   └── hook/                    # Claude Code plugin
│       ├── .claude-plugin/
│       │   └── plugin.json      # Plugin metadata
│       ├── hooks/
│       │   └── hooks.json       # Hook definitions
│       └── src/
│           └── index.ts         # CLI entry point
├── packages/
│   ├── server/                  # Bun HTTP server
│   │   ├── index.ts            # Main server
│   │   ├── handlers/           # Route handlers
│   │   │   ├── plan.ts
│   │   │   ├── bash.ts
│   │   │   ├── edit.ts
│   │   │   └── question.ts
│   │   └── utils/
│   │       ├── browser.ts
│   │       └── remote.ts
│   └── ui/                      # React UI
│       ├── src/
│       │   ├── App.tsx
│       │   ├── views/
│       │   │   ├── PlanView.tsx
│       │   │   ├── BashView.tsx
│       │   │   ├── EditView.tsx
│       │   │   └── QuestionView.tsx
│       │   └── components/
│       └── index.html
├── scripts/
│   └── install.sh              # Installation script
├── .claude-plugin/
│   └── marketplace.json        # Marketplace config
├── LICENSE                     # MIT License
└── package.json
```

### Hook Configuration

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
    ]
  }
}
```

### Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/context` | GET | Get current interaction context |
| `/api/approve` | POST | Approve action |
| `/api/deny` | POST | Deny action with feedback |
| `/api/answer` | POST | Submit question answer |
| `/*` | GET | Serve SPA |

### Response Formats

**Plan Approval:**
```json
{
  "hookSpecificOutput": {
    "decision": { "behavior": "allow" }
  }
}
```

**Bash Approval:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": { "behavior": "allow|deny", "message": "feedback" }
  }
}
```

**Question Response:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "answers": { "q1": "selected_option" }
    }
  }
}
```

## UI Design

### Plan View
- Full-width markdown with syntax highlighting
- Floating annotation toolbar
- Sidebar for annotation list
- Top bar: Approve / Request Changes buttons

### Bash View
- Large command display with syntax highlighting
- Risk indicator badge
- Command breakdown (flags, arguments)
- Working directory badge
- Approve / Deny buttons

### Edit View
- Split diff view (old | new)
- File path header
- Line numbers
- Change type indicators (+/-)
- Approve / Deny buttons

### Question View
- Question text prominently displayed
- Option cards with descriptions
- Radio/Checkbox selection
- Custom input text area
- Submit button

## Distribution

### Plugin Marketplace
- Register at Claude Code plugin marketplace
- Auto-install via `/plugin marketplace add <owner>/yourturn`

### Manual Installation
- Binary releases for macOS (arm64, x64), Linux (x64), Windows (x64)
- Install script: `curl -fsSL https://yourturn.dev/install.sh | bash`

## License

MIT License - free for any use, including commercial.
