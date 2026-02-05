import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  initSessionStorage,
  saveSessions,
  loadSessions,
  persistSession,
  removeSession,
  scheduleAutoSave,
  clearAutoSaveTimer,
  type PersistedWebSession
} from '../session-persistence';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('SessionPersistence', () => {
  const STORAGE_DIR = path.join(os.homedir(), '.claude', 'orchestrator');
  const STORAGE_FILE = path.join(STORAGE_DIR, 'web-sessions.json');
  let originalContent: string | null = null;

  beforeEach(() => {
    // Backup existing file if it exists
    if (fs.existsSync(STORAGE_FILE)) {
      originalContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
    }
  });

  afterEach(() => {
    // Clear any pending auto-save timers
    clearAutoSaveTimer();

    // Restore original file
    if (originalContent !== null) {
      fs.writeFileSync(STORAGE_FILE, originalContent);
    } else {
      // Remove test file if we created it
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
      }
    }
    originalContent = null;
  });

  describe('initSessionStorage', () => {
    test('creates storage directory if it does not exist', () => {
      // Directory may already exist, so we just test it doesn't throw
      expect(() => initSessionStorage()).not.toThrow();
      expect(fs.existsSync(STORAGE_DIR)).toBe(true);
    });

    test('succeeds when directory already exists', () => {
      initSessionStorage();
      expect(() => initSessionStorage()).not.toThrow();
    });
  });

  describe('saveSessions', () => {
    test('saves empty array', () => {
      saveSessions([]);
      expect(fs.existsSync(STORAGE_FILE)).toBe(true);

      const content = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      expect(content.sessions).toEqual([]);
      expect(content.lastUpdated).toBeDefined();
    });

    test('saves sessions to file', () => {
      const sessions: PersistedWebSession[] = [
        {
          id: 'test-1',
          cwd: '/test/dir',
          projectName: 'test-project',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      saveSessions(sessions);

      const content = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      expect(content.sessions).toHaveLength(1);
      expect(content.sessions[0].id).toBe('test-1');
    });

    test('saves multiple sessions', () => {
      const sessions: PersistedWebSession[] = [
        {
          id: 'test-1',
          cwd: '/test/dir1',
          projectName: 'project1',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        },
        {
          id: 'test-2',
          cwd: '/test/dir2',
          projectName: 'project2',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      saveSessions(sessions);

      const content = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      expect(content.sessions).toHaveLength(2);
    });

    test('overwrites existing file', () => {
      const session1: PersistedWebSession[] = [
        {
          id: 'old',
          cwd: '/old',
          projectName: 'old',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      saveSessions(session1);

      const session2: PersistedWebSession[] = [
        {
          id: 'new',
          cwd: '/new',
          projectName: 'new',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      saveSessions(session2);

      const content = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      expect(content.sessions).toHaveLength(1);
      expect(content.sessions[0].id).toBe('new');
    });

    test('includes lastUpdated timestamp', () => {
      saveSessions([]);

      const content = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      expect(content.lastUpdated).toBeDefined();
      expect(new Date(content.lastUpdated).getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('loadSessions', () => {
    test('returns empty array when file does not exist', () => {
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
      }

      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });

    test('loads saved sessions', () => {
      const sessions: PersistedWebSession[] = [
        {
          id: 'test-load',
          cwd: '/test',
          projectName: 'test',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      saveSessions(sessions);
      const loaded = loadSessions();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-load');
    });

    test('handles invalid JSON gracefully', () => {
      fs.writeFileSync(STORAGE_FILE, 'invalid json {');

      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('persistSession', () => {
    test('adds new session to storage', () => {
      const session: PersistedWebSession = {
        id: 'persist-test',
        cwd: '/test',
        projectName: 'test',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      persistSession(session);

      const loaded = loadSessions();
      expect(loaded.some(s => s.id === 'persist-test')).toBe(true);
    });

    test('updates existing session', () => {
      const session: PersistedWebSession = {
        id: 'update-test',
        cwd: '/old',
        projectName: 'old',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      persistSession(session);

      const updated: PersistedWebSession = {
        ...session,
        cwd: '/new',
        projectName: 'new'
      };

      persistSession(updated);

      const loaded = loadSessions();
      const found = loaded.find(s => s.id === 'update-test');
      expect(found?.cwd).toBe('/new');
      expect(found?.projectName).toBe('new');
    });

    test('preserves other sessions when updating', () => {
      const session1: PersistedWebSession = {
        id: 'session-1',
        cwd: '/1',
        projectName: '1',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      const session2: PersistedWebSession = {
        id: 'session-2',
        cwd: '/2',
        projectName: '2',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      persistSession(session1);
      persistSession(session2);

      const updated1 = { ...session1, projectName: 'updated' };
      persistSession(updated1);

      const loaded = loadSessions();
      expect(loaded).toHaveLength(2);
      expect(loaded.find(s => s.id === 'session-2')).toBeDefined();
    });
  });

  describe('removeSession', () => {
    test('removes session from storage', () => {
      const session: PersistedWebSession = {
        id: 'remove-test',
        cwd: '/test',
        projectName: 'test',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      persistSession(session);
      expect(loadSessions().some(s => s.id === 'remove-test')).toBe(true);

      removeSession('remove-test');
      expect(loadSessions().some(s => s.id === 'remove-test')).toBe(false);
    });

    test('handles removing non-existent session gracefully', () => {
      expect(() => removeSession('non-existent')).not.toThrow();
    });

    test('preserves other sessions when removing', () => {
      const session1: PersistedWebSession = {
        id: 'keep-1',
        cwd: '/1',
        projectName: '1',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      const session2: PersistedWebSession = {
        id: 'remove-2',
        cwd: '/2',
        projectName: '2',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      persistSession(session1);
      persistSession(session2);

      removeSession('remove-2');

      const loaded = loadSessions();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('keep-1');
    });
  });

  describe('scheduleAutoSave', () => {
    test('saves sessions after delay', async () => {
      const sessions: PersistedWebSession[] = [
        {
          id: 'auto-save-test',
          cwd: '/test',
          projectName: 'test',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      scheduleAutoSave(sessions);

      // Wait for auto-save to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      const loaded = loadSessions();
      expect(loaded.some(s => s.id === 'auto-save-test')).toBe(true);

      clearAutoSaveTimer();
    });

    test('debounces multiple calls', async () => {
      const sessions1: PersistedWebSession[] = [
        {
          id: 'debounce-1',
          cwd: '/1',
          projectName: '1',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      const sessions2: PersistedWebSession[] = [
        {
          id: 'debounce-2',
          cwd: '/2',
          projectName: '2',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      scheduleAutoSave(sessions1);
      // Immediately schedule another save - should cancel first one
      scheduleAutoSave(sessions2);

      // Wait for save
      await new Promise(resolve => setTimeout(resolve, 600));

      const loaded = loadSessions();
      // Only the second save should have executed
      expect(loaded.some(s => s.id === 'debounce-2')).toBe(true);
      expect(loaded.some(s => s.id === 'debounce-1')).toBe(false);

      clearAutoSaveTimer();
    });
  });

  describe('clearAutoSaveTimer', () => {
    test('cancels pending auto-save', async () => {
      const sessions: PersistedWebSession[] = [
        {
          id: 'cancel-test',
          cwd: '/test',
          projectName: 'test',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      ];

      // Remove the file first to ensure we know if save happened
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
      }

      scheduleAutoSave(sessions);
      clearAutoSaveTimer();

      // Wait to see if save happens
      await new Promise(resolve => setTimeout(resolve, 600));

      // File should not exist because save was cancelled
      expect(fs.existsSync(STORAGE_FILE)).toBe(false);
    });

    test('can be called multiple times safely', () => {
      clearAutoSaveTimer();
      clearAutoSaveTimer();
      expect(true).toBe(true); // Should not throw
    });
  });
});
