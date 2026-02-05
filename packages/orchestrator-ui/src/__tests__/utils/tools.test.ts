import { describe, test, expect } from 'bun:test';
import { getToolColor, getHookIcon, formatToolInput, getFilePathFromToolUse, getLanguageFromPath } from '../../utils/tools';

describe('Tool Utilities', () => {
  describe('getToolColor', () => {
    test('returns color for known tool', () => {
      const color = getToolColor('Bash');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    test('returns default color for unknown tool', () => {
      const color = getToolColor('UnknownTool');
      expect(color).toBe('text-gray-400');
    });
  });

  describe('getHookIcon', () => {
    test('returns icon for known hook type', () => {
      const icon = getHookIcon('bash');
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('string');
    });

    test('returns default icon for unknown hook type', () => {
      const icon = getHookIcon('unknown');
      expect(icon).toBeDefined();
    });
  });

  describe('formatToolInput', () => {
    test('formats Bash command input', () => {
      const input = { command: 'ls -la /home/user' };
      const result = formatToolInput('Bash', input);
      expect(result).toContain('ls -la');
    });

    test('truncates long Bash commands', () => {
      const longCommand = 'a'.repeat(100);
      const input = { command: longCommand };
      const result = formatToolInput('Bash', input);
      expect(result.length).toBeLessThanOrEqual(63); // 60 + '...'
      expect(result).toContain('...');
    });

    test('handles multiline Bash commands', () => {
      const input = { command: 'echo "line1"\necho "line2"' };
      const result = formatToolInput('Bash', input);
      expect(result).toBe('echo "line1"');
    });

    test('formats Read tool with file path', () => {
      const input = { file_path: '/path/to/file.ts' };
      const result = formatToolInput('Read', input);
      expect(result).toBe('/path/to/file.ts');
    });

    test('formats Write tool with file path', () => {
      const input = { file_path: '/path/to/output.txt' };
      const result = formatToolInput('Write', input);
      expect(result).toBe('/path/to/output.txt');
    });

    test('formats Edit tool with file path', () => {
      const input = { file_path: '/path/to/edit.js' };
      const result = formatToolInput('Edit', input);
      expect(result).toBe('/path/to/edit.js');
    });

    test('formats Grep with pattern', () => {
      const input = { pattern: 'error.*log' };
      const result = formatToolInput('Grep', input);
      expect(result).toBe('"error.*log"');
    });

    test('formats Glob with pattern', () => {
      const input = { pattern: '**/*.ts' };
      const result = formatToolInput('Glob', input);
      expect(result).toBe('"**/*.ts"');
    });

    test('formats Task with description', () => {
      const input = { description: 'This is a task description that might be long' };
      const result = formatToolInput('Task', input);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('formats WebFetch with URL', () => {
      const input = { url: 'https://example.com/api/data?param=value' };
      const result = formatToolInput('WebFetch', input);
      expect(result).toContain('https://example.com');
    });

    test('returns empty string for unknown tool', () => {
      const input = { someKey: 'value' };
      const result = formatToolInput('UnknownTool', input);
      expect(result).toBe('');
    });

    test('handles missing input fields gracefully', () => {
      const result = formatToolInput('Bash', {});
      expect(result).toBeDefined();
    });
  });

  describe('getFilePathFromToolUse', () => {
    test('extracts file path from Read tool', () => {
      const input = { file_path: '/test/file.ts' };
      const result = getFilePathFromToolUse('Read', input);
      expect(result).toBe('/test/file.ts');
    });

    test('extracts file path from Write tool', () => {
      const input = { file_path: '/test/output.txt' };
      const result = getFilePathFromToolUse('Write', input);
      expect(result).toBe('/test/output.txt');
    });

    test('extracts file path from Edit tool', () => {
      const input = { file_path: '/test/edit.js' };
      const result = getFilePathFromToolUse('Edit', input);
      expect(result).toBe('/test/edit.js');
    });

    test('returns null for tools without file_path', () => {
      const input = { command: 'ls -la' };
      const result = getFilePathFromToolUse('Bash', input);
      expect(result).toBe(null);
    });

    test('returns null when file_path is missing', () => {
      const result = getFilePathFromToolUse('Read', {});
      expect(result).toBe(null);
    });
  });

  describe('getLanguageFromPath', () => {
    test('detects TypeScript files', () => {
      expect(getLanguageFromPath('file.ts')).toBe('typescript');
      expect(getLanguageFromPath('component.tsx')).toBe('tsx');
    });

    test('detects JavaScript files', () => {
      expect(getLanguageFromPath('script.js')).toBe('javascript');
      expect(getLanguageFromPath('component.jsx')).toBe('jsx');
    });

    test('detects Python files', () => {
      expect(getLanguageFromPath('script.py')).toBe('python');
    });

    test('detects various programming languages', () => {
      expect(getLanguageFromPath('main.go')).toBe('go');
      expect(getLanguageFromPath('main.rs')).toBe('rust');
      expect(getLanguageFromPath('Main.java')).toBe('java');
      expect(getLanguageFromPath('script.rb')).toBe('ruby');
    });

    test('detects shell scripts', () => {
      expect(getLanguageFromPath('script.sh')).toBe('bash');
      expect(getLanguageFromPath('script.bash')).toBe('bash');
      expect(getLanguageFromPath('file.zsh')).toBe('bash');
    });

    test('detects markup and config files', () => {
      expect(getLanguageFromPath('data.json')).toBe('json');
      expect(getLanguageFromPath('config.yaml')).toBe('yaml');
      expect(getLanguageFromPath('config.yml')).toBe('yaml');
      expect(getLanguageFromPath('Cargo.toml')).toBe('toml');
      expect(getLanguageFromPath('README.md')).toBe('markdown');
    });

    test('detects web files', () => {
      expect(getLanguageFromPath('index.html')).toBe('html');
      expect(getLanguageFromPath('style.css')).toBe('css');
      expect(getLanguageFromPath('style.scss')).toBe('scss');
    });

    test('returns null for unknown extensions', () => {
      expect(getLanguageFromPath('file.xyz')).toBe(null);
      expect(getLanguageFromPath('file.unknown')).toBe(null);
    });

    test('returns null for files without extension', () => {
      expect(getLanguageFromPath('Dockerfile')).toBe(null);
      expect(getLanguageFromPath('Makefile')).toBe(null);
    });

    test('handles case insensitivity', () => {
      expect(getLanguageFromPath('FILE.TS')).toBe('typescript');
      expect(getLanguageFromPath('SCRIPT.PY')).toBe('python');
    });

    test('handles paths with directories', () => {
      expect(getLanguageFromPath('/path/to/file.ts')).toBe('typescript');
      expect(getLanguageFromPath('src/components/App.tsx')).toBe('tsx');
    });
  });
});
