import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { logger } from './logger';

const log = logger.child('SessionPersistence');

export interface PersistedWebSession {
  id: string;
  cwd: string;
  projectName: string;
  createdAt: string;
  lastActivity: string;
  resumeSessionId?: string;
}

export interface SessionStore {
  sessions: PersistedWebSession[];
  lastUpdated: string;
}

// Storage location
const STORAGE_DIR = path.join(os.homedir(), '.claude', 'orchestrator');
const STORAGE_FILE = path.join(STORAGE_DIR, 'web-sessions.json');

// Auto-save debounce timer
let autoSaveTimer: Timer | null = null;
const AUTO_SAVE_DELAY = 500; // ms

/**
 * Initialize storage directory
 * Creates ~/.claude/orchestrator if it doesn't exist
 */
export function initSessionStorage(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
      log.info('Created session storage directory', { data: { path: STORAGE_DIR } });
    }
  } catch (err) {
    log.error('Failed to initialize session storage directory', err, {
      data: { path: STORAGE_DIR }
    });
    throw err;
  }
}

/**
 * Save all active sessions to disk
 * @param sessions Array of sessions to persist
 */
export function saveSessions(sessions: PersistedWebSession[]): void {
  try {
    // Ensure directory exists
    initSessionStorage();

    const store: SessionStore = {
      sessions,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    log.debug('Saved sessions to disk', { data: { count: sessions.length } });
  } catch (err) {
    log.error('Failed to save sessions', err, { data: { path: STORAGE_FILE } });
  }
}

/**
 * Load saved sessions from disk
 * @returns Array of persisted sessions, or empty array if file doesn't exist
 */
export function loadSessions(): PersistedWebSession[] {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      log.debug('No session file found, returning empty array');
      return [];
    }

    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const store: SessionStore = JSON.parse(content);

    log.info('Loaded sessions from disk', {
      data: {
        count: store.sessions.length,
        lastUpdated: store.lastUpdated
      }
    });

    return store.sessions;
  } catch (err) {
    log.error('Failed to load sessions', err, { data: { path: STORAGE_FILE } });
    return [];
  }
}

/**
 * Add or update a single session in storage
 * @param session Session to persist
 */
export function persistSession(session: PersistedWebSession): void {
  try {
    const sessions = loadSessions();

    // Find existing session or add new one
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
      log.debug('Updated existing session', { data: { id: session.id } });
    } else {
      sessions.push(session);
      log.debug('Added new session', { data: { id: session.id } });
    }

    saveSessions(sessions);
  } catch (err) {
    log.error('Failed to persist session', err, { data: { sessionId: session.id } });
  }
}

/**
 * Remove a session from storage
 * @param sessionId ID of session to remove
 */
export function removeSession(sessionId: string): void {
  try {
    const sessions = loadSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);

    if (filtered.length < sessions.length) {
      saveSessions(filtered);
      log.debug('Removed session from storage', { data: { id: sessionId } });
    } else {
      log.debug('Session not found in storage', { data: { id: sessionId } });
    }
  } catch (err) {
    log.error('Failed to remove session', err, { data: { sessionId } });
  }
}

/**
 * Schedule auto-save with debounce to prevent excessive writes
 * @param sessions Array of sessions to save
 */
export function scheduleAutoSave(sessions: PersistedWebSession[]): void {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  // Schedule new save
  autoSaveTimer = setTimeout(() => {
    saveSessions(sessions);
    autoSaveTimer = null;
  }, AUTO_SAVE_DELAY);
}

/**
 * Clear the auto-save timer (useful for cleanup)
 */
export function clearAutoSaveTimer(): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}
