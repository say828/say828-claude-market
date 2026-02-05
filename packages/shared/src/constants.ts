// Time constants
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const POLL_INTERVAL_MS = 1000; // 1 second
export const RECONNECT_DELAY_MS = 2000; // 2 seconds
export const AUTO_DELETE_INTERVAL_MS = 30000; // 30 seconds

// UI constants
export const MAX_NOTIFICATIONS = 50;
export const PREVIEW_LENGTH = 100;
export const MAX_MESSAGE_LENGTH = 150;

// Default settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabledHooks: {
    bash: true,
    edit: true,
    plan: true,
    question: true,
  },
  soundEnabled: true,
  soundType: 'chime' as const,
  browserNotifications: false,
  autoDeleteMinutes: 5,
};

export const DEFAULT_APP_SETTINGS = {
  serverUrl: '',
};

// Server defaults
export const DEFAULT_PORT = 18700;

// Tool name to color mapping
export const TOOL_COLORS: Record<string, string> = {
  Bash: 'text-yellow-400',
  Read: 'text-blue-400',
  Write: 'text-green-400',
  Edit: 'text-green-400',
  Grep: 'text-purple-400',
  Glob: 'text-purple-400',
  Task: 'text-cyan-400',
  WebFetch: 'text-orange-400',
  WebSearch: 'text-orange-400',
};

// Hook type icons
export const HOOK_ICONS: Record<string, string> = {
  bash: '💻',
  edit: '📝',
  plan: '📋',
  question: '❓',
  default: '⚡',
};

// ANSI color codes
export const ANSI_COLORS: Record<number, string> = {
  30: '#4a4a4a', 31: '#ff6b6b', 32: '#69db7c', 33: '#ffd43b',
  34: '#74c0fc', 35: '#e599f7', 36: '#63e6be', 37: '#f1f3f5',
  90: '#868e96', 91: '#ff8787', 92: '#8ce99a', 93: '#ffe066',
  94: '#a5d8ff', 95: '#eebefa', 96: '#96f2d7', 97: '#ffffff',
};

export const ANSI_BG_COLORS: Record<number, string> = {
  40: '#4a4a4a', 41: '#ff6b6b', 42: '#69db7c', 43: '#ffd43b',
  44: '#74c0fc', 45: '#e599f7', 46: '#63e6be', 47: '#f1f3f5',
  100: '#868e96', 101: '#ff8787', 102: '#8ce99a', 103: '#ffe066',
  104: '#a5d8ff', 105: '#eebefa', 106: '#96f2d7', 107: '#ffffff',
};

// Notification sounds
export const NOTIFICATION_SOUNDS = {
  gentle: [
    { freq: 440, duration: 0.15, delay: 0, volume: 0.15 },
    { freq: 523, duration: 0.15, delay: 0.12, volume: 0.15 },
  ],
  chime: [
    { freq: 523, duration: 0.2, delay: 0, volume: 0.2 },
    { freq: 659, duration: 0.2, delay: 0.1, volume: 0.2 },
    { freq: 784, duration: 0.3, delay: 0.2, volume: 0.2 },
  ],
  alert: [
    { freq: 880, duration: 0.15, delay: 0, volume: 0.3 },
    { freq: 880, duration: 0.15, delay: 0.2, volume: 0.3 },
  ],
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  interrupt: ['Control+c', 'Escape'],
  expand: ['Control+o'],
  retry: ['Control+r'],
  clear: ['Control+l'],
  commandPalette: ['Meta+k', 'Control+k'],
  newSession: ['Meta+n', 'Control+n'],
  search: ['Meta+f', 'Control+f'],
} as const;

// Slash commands
export const SLASH_COMMANDS = [
  { cmd: '/help', desc: 'Show help' },
  { cmd: '/clear', desc: 'Clear conversation' },
  { cmd: '/compact', desc: 'Compact mode' },
  { cmd: '/config', desc: 'View config' },
  { cmd: '/cost', desc: 'Show costs' },
  { cmd: '/model', desc: 'Change model' },
  { cmd: '/memory', desc: 'Edit memory' },
  { cmd: '/permissions', desc: 'View permissions' },
  { cmd: '/status', desc: 'Show status' },
  { cmd: '/review', desc: 'Review changes' },
] as const;

// Editor commands
export const EDITORS = [
  { id: 'vscode', name: 'VS Code', command: 'code' },
  { id: 'cursor', name: 'Cursor', command: 'cursor' },
  { id: 'idea', name: 'IntelliJ IDEA', command: 'idea' },
  { id: 'webstorm', name: 'WebStorm', command: 'webstorm' },
  { id: 'fleet', name: 'Fleet', command: 'fleet' },
] as const;

// Local storage keys
export const STORAGE_KEYS = {
  notificationSettings: 'orchestrator-notification-settings',
  appSettings: 'orchestrator-app-settings',
  theme: 'orchestrator-theme',
  sessionTemplates: 'orchestrator-session-templates',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  sessions: '/api/sessions',
  session: (id: string) => `/api/session/${id}`,
  webSession: '/api/web-session',
  webSessions: '/api/web-sessions',
  webSessionAction: (id: string, action: string) => `/api/web-session/${id}/${action}`,
  stats: '/api/stats',
  plugins: '/api/plugins',
  plugin: (id: string) => `/api/plugins/${id}`,
  settings: '/api/settings',
  settingsLocal: '/api/settings-local',
  claudeMd: '/api/claude-md',
  openEditor: '/api/open-editor',
} as const;

// WebSocket events
export const WS_EVENTS = {
  init: 'init',
  sessionsUpdate: 'sessions_update',
  hookAlert: 'hook_alert',
  webSession: 'web_session',
  hookNotification: 'hook_notification',
  subscribeWebSession: 'subscribe_web_session',
  unsubscribeWebSession: 'unsubscribe_web_session',
} as const;

// Status colors
export const STATUS_COLORS = {
  active: 'bg-green-400',
  idle: 'bg-gray-600',
  pending_hook: 'bg-yellow-400',
  starting: 'bg-yellow-400 animate-pulse',
  completed: 'bg-gray-400',
  error: 'bg-red-400',
} as const;

// Theme definitions
export const THEMES = {
  dark: {
    bg: '#0a0a0a',
    bgSecondary: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: 'rgba(255, 255, 255, 0.1)',
    accent: '#3b82f6',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
  },
  light: {
    bg: '#ffffff',
    bgSecondary: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: 'rgba(0, 0, 0, 0.1)',
    accent: '#2563eb',
    error: '#dc2626',
    warning: '#d97706',
    success: '#16a34a',
  },
} as const;

// File type to language mapping for syntax highlighting
export const FILE_EXTENSIONS_TO_LANG: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  mjs: 'javascript',
  cjs: 'javascript',
  // Web
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  // Data
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  // Python
  py: 'python',
  pyw: 'python',
  // Ruby
  rb: 'ruby',
  // Go
  go: 'go',
  // Rust
  rs: 'rust',
  // Java/Kotlin
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  // C/C++
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  // C#
  cs: 'csharp',
  // PHP
  php: 'php',
  // Swift
  swift: 'swift',
  // Markdown
  md: 'markdown',
  mdx: 'mdx',
  // SQL
  sql: 'sql',
  // Docker
  dockerfile: 'dockerfile',
  // Config
  env: 'ini',
  ini: 'ini',
  conf: 'ini',
  // GraphQL
  graphql: 'graphql',
  gql: 'graphql',
};
