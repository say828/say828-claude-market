import { describe, test, expect } from 'bun:test';
import * as configManager from '../config-manager';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Note: These tests use the actual ~/.claude directory
// They test the real config manager functions

describe('ConfigManager', () => {
  const CLAUDE_DIR = path.join(os.homedir(), '.claude');

  describe('getSettings', () => {
    test('returns object (empty or with content)', () => {
      const settings = configManager.getSettings();
      expect(typeof settings).toBe('object');
      expect(settings).toBeDefined();
    });

    test('returns valid JSON structure', () => {
      const settings = configManager.getSettings();
      // Should be parseable as JSON
      expect(() => JSON.stringify(settings)).not.toThrow();
    });
  });

  describe('getLocalSettings', () => {
    test('returns object', () => {
      const settings = configManager.getLocalSettings();
      expect(typeof settings).toBe('object');
      expect(settings).toBeDefined();
    });
  });

  describe('getCommands', () => {
    test('returns array', () => {
      const commands = configManager.getCommands();
      expect(Array.isArray(commands)).toBe(true);
    });

    test('commands have required properties', () => {
      const commands = configManager.getCommands();
      for (const cmd of commands) {
        expect(cmd).toHaveProperty('name');
        expect(cmd).toHaveProperty('path');
        expect(cmd).toHaveProperty('content');
      }
    });
  });

  describe('getHooks', () => {
    test('returns array', () => {
      const hooks = configManager.getHooks();
      expect(Array.isArray(hooks)).toBe(true);
    });

    test('hooks have required properties', () => {
      const hooks = configManager.getHooks();
      for (const hook of hooks) {
        expect(hook).toHaveProperty('name');
        expect(hook).toHaveProperty('path');
        expect(hook).toHaveProperty('content');
      }
    });
  });

  describe('getClaudeMd', () => {
    test('returns ClaudeMdContent object', () => {
      const claudeMd = configManager.getClaudeMd();
      expect(claudeMd).toHaveProperty('exists');
      expect(claudeMd).toHaveProperty('content');
      expect(claudeMd).toHaveProperty('path');
      expect(typeof claudeMd.exists).toBe('boolean');
      expect(typeof claudeMd.content).toBe('string');
      expect(typeof claudeMd.path).toBe('string');
    });

    test('path points to CLAUDE.md in home directory', () => {
      const claudeMd = configManager.getClaudeMd();
      expect(claudeMd.path).toContain('.claude');
      expect(claudeMd.path).toContain('CLAUDE.md');
    });
  });

  describe('getAllConfig', () => {
    test('returns all configuration sections', () => {
      const config = configManager.getAllConfig();
      expect(config).toHaveProperty('settings');
      expect(config).toHaveProperty('settingsLocal');
      expect(config).toHaveProperty('commands');
      expect(config).toHaveProperty('hooks');
      expect(config).toHaveProperty('claudeMd');
    });

    test('settings are objects', () => {
      const config = configManager.getAllConfig();
      expect(typeof config.settings).toBe('object');
      expect(typeof config.settingsLocal).toBe('object');
    });

    test('commands and hooks are arrays', () => {
      const config = configManager.getAllConfig();
      expect(Array.isArray(config.commands)).toBe(true);
      expect(Array.isArray(config.hooks)).toBe(true);
    });
  });

  describe('getConfigPaths', () => {
    test('returns all config paths', () => {
      const paths = configManager.getConfigPaths();
      expect(paths).toHaveProperty('claudeDir');
      expect(paths).toHaveProperty('settings');
      expect(paths).toHaveProperty('settingsLocal');
      expect(paths).toHaveProperty('claudeMd');
      expect(paths).toHaveProperty('commands');
      expect(paths).toHaveProperty('hooks');
    });

    test('all paths are strings', () => {
      const paths = configManager.getConfigPaths();
      Object.values(paths).forEach(p => {
        expect(typeof p).toBe('string');
      });
    });

    test('paths are absolute', () => {
      const paths = configManager.getConfigPaths();
      Object.values(paths).forEach(p => {
        expect(path.isAbsolute(p)).toBe(true);
      });
    });
  });

  describe('updateSettings and updateLocalSettings', () => {
    test('updateSettings writes to file system', () => {
      const settingsFile = path.join(CLAUDE_DIR, 'settings.json');
      const originalExists = fs.existsSync(settingsFile);
      let originalContent = '';

      if (originalExists) {
        originalContent = fs.readFileSync(settingsFile, 'utf-8');
      }

      try {
        const testSettings = { test: 'value-' + Date.now() };
        configManager.updateSettings(testSettings);

        expect(fs.existsSync(settingsFile)).toBe(true);
        const written = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
        expect(written.test).toBe(testSettings.test);
      } finally {
        // Restore original
        if (originalExists) {
          fs.writeFileSync(settingsFile, originalContent);
        } else {
          if (fs.existsSync(settingsFile)) {
            fs.unlinkSync(settingsFile);
          }
        }
      }
    });

    test('updateLocalSettings writes to file system', () => {
      const localSettingsFile = path.join(CLAUDE_DIR, 'settings.local.json');
      const originalExists = fs.existsSync(localSettingsFile);
      let originalContent = '';

      if (originalExists) {
        originalContent = fs.readFileSync(localSettingsFile, 'utf-8');
      }

      try {
        const testSettings = { localTest: 'value-' + Date.now() };
        configManager.updateLocalSettings(testSettings);

        expect(fs.existsSync(localSettingsFile)).toBe(true);
        const written = JSON.parse(fs.readFileSync(localSettingsFile, 'utf-8'));
        expect(written.localTest).toBe(testSettings.localTest);
      } finally {
        // Restore original
        if (originalExists) {
          fs.writeFileSync(localSettingsFile, originalContent);
        } else {
          if (fs.existsSync(localSettingsFile)) {
            fs.unlinkSync(localSettingsFile);
          }
        }
      }
    });
  });

  describe('updateClaudeMd', () => {
    test('writes content to CLAUDE.md', () => {
      const claudeMdFile = path.join(CLAUDE_DIR, 'CLAUDE.md');
      const originalExists = fs.existsSync(claudeMdFile);
      let originalContent = '';

      if (originalExists) {
        originalContent = fs.readFileSync(claudeMdFile, 'utf-8');
      }

      try {
        const testContent = '# Test Content ' + Date.now();
        configManager.updateClaudeMd(testContent);

        expect(fs.existsSync(claudeMdFile)).toBe(true);
        const written = fs.readFileSync(claudeMdFile, 'utf-8');
        expect(written).toBe(testContent);
      } finally {
        // Restore original
        if (originalExists) {
          fs.writeFileSync(claudeMdFile, originalContent);
        } else {
          if (fs.existsSync(claudeMdFile)) {
            fs.unlinkSync(claudeMdFile);
          }
        }
      }
    });
  });
});
