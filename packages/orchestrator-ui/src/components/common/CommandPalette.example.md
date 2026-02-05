# CommandPalette Visual Example

## UI Structure

```
┌─────────────────────────────────────────────┐
│  Search commands...                         │  ← Input field
├─────────────────────────────────────────────┤
│  SESSIONS                                   │  ← Category header
│  → Switch to my-project                     │
│  → Switch to another-project                │
│  → New Session                  Ctrl+N      │  ← With shortcut hint
├─────────────────────────────────────────────┤
│  NAVIGATION                                 │
│  → Go to Sessions                      1    │
│  → Go to Plugins                       2    │
│  → Go to Settings                      3    │
├─────────────────────────────────────────────┤
│  ACTIONS                                    │
│  → Clear Notifications                      │
├─────────────────────────────────────────────┤
│  COMMANDS                                   │
│  → /help - Show help                        │
│  → /clear - Clear conversation              │
│  → /cost - Show costs                       │
│  → /compact - Toggle compact mode           │
│  → /config - View configuration             │
│  → /model - Change model                    │
│  → /memory - Edit memory                    │
│  → /permissions - View permissions          │
│  → /status - Show status                    │
│  → /review - Review changes                 │
├─────────────────────────────────────────────┤
│  ↑↓ Navigate    ↵ Select    Esc Close      │  ← Footer hints
└─────────────────────────────────────────────┘
```

## Color Scheme

- **Background**: `#1a1a1a` (dark gray)
- **Border**: `white/10` (subtle white with 10% opacity)
- **Text**:
  - Primary: `white`
  - Secondary: `gray-500`
  - Category headers: `gray-500` (uppercase)
- **Selected item**: `bg-white/10` (highlighted)
- **Hover state**: `bg-white/5` (subtle)
- **Shortcuts**: `gray-500` in mono font

## Interaction States

### Default State
```
  Go to Sessions                          1
```

### Hover State (mouse over)
```
  Go to Sessions                          1   (with bg-white/5)
```

### Selected State (keyboard navigation)
```
  Go to Sessions                          1   (with bg-white/10)
```

### Filtered State (after typing "session")
```
┌─────────────────────────────────────────────┐
│  session                                    │
├─────────────────────────────────────────────┤
│  SESSIONS                                   │
│  → Switch to my-project                     │
│  → Switch to another-project                │
│  → New Session                  Ctrl+N      │
├─────────────────────────────────────────────┤
│  NAVIGATION                                 │
│  → Go to Sessions                      1    │
├─────────────────────────────────────────────┤
│  ↑↓ Navigate    ↵ Select    Esc Close      │
└─────────────────────────────────────────────┘
```

## Usage Flow

1. User presses **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux)
2. Modal appears with input focused
3. User can:
   - Type to filter commands
   - Use arrow keys to navigate
   - Press Enter to execute
   - Press Escape to close
4. After executing command, modal closes automatically

## Features Implemented

- [x] Cmd+K / Ctrl+K keyboard shortcut
- [x] Fuzzy search (substring matching)
- [x] Keyboard navigation (arrows, Enter, Escape)
- [x] Category grouping (Sessions, Navigation, Actions, Commands)
- [x] Dynamic session list
- [x] Shortcut hints display
- [x] Auto-scroll selected item into view
- [x] Click outside to close
- [x] Auto-focus input on open
- [x] Smooth animations
- [x] Consistent dark theme styling
