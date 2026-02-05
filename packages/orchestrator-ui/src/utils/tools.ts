import { TOOL_COLORS, HOOK_ICONS } from '@claude-orchestrator/shared';

export function getToolColor(name: string): string {
  return TOOL_COLORS[name] || 'text-gray-400';
}

export function getHookIcon(type: string): string {
  return HOOK_ICONS[type] || HOOK_ICONS.default;
}

export function formatToolInput(name: string, input: Record<string, unknown>): string {
  if (name === 'Bash' && input.command) {
    const cmd = String(input.command);
    return cmd.split('\n')[0].slice(0, 60) + (cmd.length > 60 ? '...' : '');
  }
  if (name === 'Read' && input.file_path) {
    return String(input.file_path);
  }
  if ((name === 'Write' || name === 'Edit') && input.file_path) {
    return String(input.file_path);
  }
  if (name === 'Grep' && input.pattern) {
    return `"${input.pattern}"`;
  }
  if (name === 'Glob' && input.pattern) {
    return `"${input.pattern}"`;
  }
  if (name === 'Task' && input.description) {
    return String(input.description).slice(0, 50);
  }
  if (name === 'WebFetch' && input.url) {
    return String(input.url).slice(0, 50);
  }
  return '';
}

export function getFilePathFromToolUse(name: string, input: Record<string, unknown>): string | null {
  if (['Read', 'Write', 'Edit'].includes(name) && input.file_path) {
    return String(input.file_path);
  }
  return null;
}

export function getLanguageFromPath(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    sql: 'sql',
    graphql: 'graphql',
  };

  return langMap[ext] || null;
}
