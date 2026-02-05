import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const SETTINGS_LOCAL_FILE = path.join(CLAUDE_DIR, 'settings.local.json');
const CLAUDE_MD_FILE = path.join(CLAUDE_DIR, 'CLAUDE.md');
const COMMANDS_DIR = path.join(CLAUDE_DIR, 'commands');
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');

export interface ClaudeSettings {
  [key: string]: unknown;
}

export interface CustomCommand {
  name: string;
  path: string;
  content: string;
}

export interface CustomHook {
  name: string;
  path: string;
  content: string;
}

export interface ClaudeMdContent {
  exists: boolean;
  content: string;
  path: string;
}

export interface ClaudeConfig {
  settings: ClaudeSettings;
  settingsLocal: ClaudeSettings;
  commands: CustomCommand[];
  hooks: CustomHook[];
  claudeMd: ClaudeMdContent;
}

/**
 * Read a JSON file safely
 */
function readJsonFile(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return {};
  }
}

/**
 * Write a JSON file safely
 */
function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
    throw err;
  }
}

/**
 * Read all custom commands from ~/.claude/commands/
 */
function readCustomCommands(): CustomCommand[] {
  const commands: CustomCommand[] = [];

  if (!fs.existsSync(COMMANDS_DIR)) {
    return commands;
  }

  try {
    const files = fs.readdirSync(COMMANDS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(COMMANDS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        commands.push({
          name: file.replace('.json', ''),
          path: filePath,
          content
        });
      }
    }
  } catch (err) {
    console.error('Failed to read custom commands:', err);
  }

  return commands;
}

/**
 * Read all custom hooks from ~/.claude/hooks/
 */
function readCustomHooks(): CustomHook[] {
  const hooks: CustomHook[] = [];

  if (!fs.existsSync(HOOKS_DIR)) {
    return hooks;
  }

  try {
    const files = fs.readdirSync(HOOKS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(HOOKS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        hooks.push({
          name: file.replace('.json', ''),
          path: filePath,
          content
        });
      }
    }
  } catch (err) {
    console.error('Failed to read custom hooks:', err);
  }

  return hooks;
}

/**
 * Read CLAUDE.md content
 */
function readClaudeMd(): ClaudeMdContent {
  try {
    if (!fs.existsSync(CLAUDE_MD_FILE)) {
      return {
        exists: false,
        content: '',
        path: CLAUDE_MD_FILE
      };
    }
    const content = fs.readFileSync(CLAUDE_MD_FILE, 'utf-8');
    return {
      exists: true,
      content,
      path: CLAUDE_MD_FILE
    };
  } catch (err) {
    console.error('Failed to read CLAUDE.md:', err);
    return {
      exists: false,
      content: '',
      path: CLAUDE_MD_FILE
    };
  }
}

/**
 * Write CLAUDE.md content
 */
function writeClaudeMd(content: string): void {
  try {
    // Ensure directory exists
    if (!fs.existsSync(CLAUDE_DIR)) {
      fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    }
    fs.writeFileSync(CLAUDE_MD_FILE, content, 'utf-8');
  } catch (err) {
    console.error('Failed to write CLAUDE.md:', err);
    throw err;
  }
}

/**
 * Get all Claude Code configuration
 */
export function getAllConfig(): ClaudeConfig {
  return {
    settings: readJsonFile(SETTINGS_FILE),
    settingsLocal: readJsonFile(SETTINGS_LOCAL_FILE),
    commands: readCustomCommands(),
    hooks: readCustomHooks(),
    claudeMd: readClaudeMd()
  };
}

/**
 * Get Claude Code settings
 */
export function getSettings(): ClaudeSettings {
  return readJsonFile(SETTINGS_FILE);
}

/**
 * Get local Claude Code settings
 */
export function getLocalSettings(): ClaudeSettings {
  return readJsonFile(SETTINGS_LOCAL_FILE);
}

/**
 * Update Claude Code settings
 */
export function updateSettings(settings: ClaudeSettings): void {
  writeJsonFile(SETTINGS_FILE, settings);
}

/**
 * Update local Claude Code settings
 */
export function updateLocalSettings(settings: ClaudeSettings): void {
  writeJsonFile(SETTINGS_LOCAL_FILE, settings);
}

/**
 * Get custom commands
 */
export function getCommands(): CustomCommand[] {
  return readCustomCommands();
}

/**
 * Get custom hooks
 */
export function getHooks(): CustomHook[] {
  return readCustomHooks();
}

/**
 * Get CLAUDE.md content
 */
export function getClaudeMd(): ClaudeMdContent {
  return readClaudeMd();
}

/**
 * Update CLAUDE.md content
 */
export function updateClaudeMd(content: string): void {
  writeClaudeMd(content);
}

/**
 * Get config paths for debugging
 */
export function getConfigPaths() {
  return {
    claudeDir: CLAUDE_DIR,
    settings: SETTINGS_FILE,
    settingsLocal: SETTINGS_LOCAL_FILE,
    claudeMd: CLAUDE_MD_FILE,
    commands: COMMANDS_DIR,
    hooks: HOOKS_DIR
  };
}
