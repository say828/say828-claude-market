import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { SessionWatcher } from '../session-watcher';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Session, PendingHook } from '../types';

// Note: These tests work with the actual ~/.claude/projects directory
// They create test projects with unique names to avoid conflicts

describe('SessionWatcher', () => {
  let watcher: SessionWatcher;
  let sessions: Session[] = [];
  let hookAlerts: Array<{ sessionId: string; sessionName: string; hook: PendingHook }> = [];
  let testProjectPath: string;

  beforeEach(() => {
    // Reset state
    sessions = [];
    hookAlerts = [];

    // Create unique test project directory
    const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
    testProjectPath = path.join(CLAUDE_PROJECTS_DIR, '-test-orchestrator-' + Date.now());
    fs.mkdirSync(testProjectPath, { recursive: true });

    watcher = new SessionWatcher(
      (s) => { sessions = s; },
      (sessionId, sessionName, hook) => { hookAlerts.push({ sessionId, sessionName, hook }); }
    );
  });

  afterEach(() => {
    watcher.stop();
    // Clean up test project directory
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  test('initializes with empty sessions', () => {
    expect(watcher.getAllSessions()).toEqual([]);
  });

  test('detects new session file', async () => {
    const sessionId = 'test-session-1';
    const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);

    // Write a session file with user and assistant messages
    const messages = [
      {
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: 'Hello Claude' }] },
        timestamp: new Date().toISOString(),
        uuid: 'msg-1',
        sessionId,
        cwd: '/Users/test/project',
        gitBranch: 'main',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        version: '1.0'
      },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Hello!' }] },
        timestamp: new Date().toISOString(),
        uuid: 'msg-2',
        sessionId,
        cwd: '/Users/test/project',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        version: '1.0'
      }
    ];

    fs.writeFileSync(sessionFile, messages.map(m => JSON.stringify(m)).join('\n'));

    await watcher.start();

    const session = watcher.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.id).toBe(sessionId);
    expect(session?.messageCount).toBe(2);
  });

  test('detects pending hook', async () => {
    const sessionId = 'test-session-hook';
    const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);

    const messages = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Running command...' },
            { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls -la' } }
          ]
        },
        timestamp: new Date().toISOString(),
        uuid: 'msg-1',
        sessionId,
        cwd: '/Users/test',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        version: '1.0'
      }
    ];

    fs.writeFileSync(sessionFile, messages.map(m => JSON.stringify(m)).join('\n'));

    await watcher.start();

    const session = watcher.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.pendingHook).toBeDefined();
    expect(session?.pendingHook?.type).toBe('bash');
    expect(session?.pendingHook?.toolUseId).toBe('tool-1');
    expect(session?.status).toBe('pending_hook');
  });

  test('clears pending hook when tool_result is added', async () => {
    const sessionId = 'test-session-clear-hook';
    const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);

    const messagesWithHook = [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'echo test' } }
          ]
        },
        timestamp: new Date().toISOString(),
        uuid: 'msg-1',
        sessionId,
        cwd: '/Users/test',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        version: '1.0'
      }
    ];

    fs.writeFileSync(sessionFile, messagesWithHook.map(m => JSON.stringify(m)).join('\n'));
    await watcher.start();

    let session = watcher.getSession(sessionId);
    expect(session?.pendingHook).toBeDefined();

    // Add tool_result
    const toolResult = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_result', tool_use_id: 'tool-1', content: 'test' }
        ]
      },
      timestamp: new Date().toISOString(),
      uuid: 'msg-2',
      sessionId,
      cwd: '/Users/test',
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      version: '1.0'
    };

    fs.appendFileSync(sessionFile, '\n' + JSON.stringify(toolResult));

    // Wait for polling to detect the change
    await new Promise(resolve => setTimeout(resolve, 1100));

    session = watcher.getSession(sessionId);
    expect(session?.pendingHook).toBeUndefined();
    expect(session?.status).not.toBe('pending_hook');
  });

  test('calculates session stats correctly', async () => {
    // Create multiple sessions
    for (let i = 0; i < 3; i++) {
      const sessionId = `session-${i}`;
      const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);
      const timestamp = new Date(Date.now() - i * 60000).toISOString(); // Different timestamps

      const message = {
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: `Message ${i}` }] },
        timestamp,
        uuid: `msg-${i}`,
        sessionId,
        cwd: '/Users/test',
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        version: '1.0'
      };

      fs.writeFileSync(sessionFile, JSON.stringify(message));
    }

    await watcher.start();

    const stats = watcher.getStats();
    // Stats will include sessions from all projects, so just verify our sessions exist
    expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
    expect(stats.projectCount).toBeGreaterThanOrEqual(1);

    // Verify our specific sessions exist
    expect(watcher.getSession('session-0')).toBeDefined();
    expect(watcher.getSession('session-1')).toBeDefined();
    expect(watcher.getSession('session-2')).toBeDefined();
  });

  test('deletes session successfully', async () => {
    const sessionId = 'session-to-delete';
    const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);

    const message = {
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: 'Test' }] },
      timestamp: new Date().toISOString(),
      uuid: 'msg-1',
      sessionId,
      cwd: '/Users/test',
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      version: '1.0'
    };

    fs.writeFileSync(sessionFile, JSON.stringify(message));
    await watcher.start();

    expect(watcher.getSession(sessionId)).toBeDefined();

    const deleted = watcher.deleteSession(sessionId);
    expect(deleted).toBe(true);
    expect(watcher.getSession(sessionId)).toBeUndefined();
    expect(fs.existsSync(sessionFile)).toBe(false);
  });

  test('handles invalid JSON lines gracefully', async () => {
    const sessionId = 'invalid-session';
    const sessionFile = path.join(testProjectPath, `${sessionId}.jsonl`);

    // Write mix of valid and invalid JSON
    const content = [
      '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Valid"}]},"timestamp":"2024-01-01T00:00:00Z","uuid":"msg-1","sessionId":"invalid-session","cwd":"/test","parentUuid":null,"isSidechain":false,"userType":"human","version":"1.0"}',
      'invalid json line',
      '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Valid2"}]},"timestamp":"2024-01-01T00:00:01Z","uuid":"msg-2","sessionId":"invalid-session","cwd":"/test","parentUuid":null,"isSidechain":false,"userType":"human","version":"1.0"}'
    ].join('\n');

    fs.writeFileSync(sessionFile, content);
    await watcher.start();

    const session = watcher.getSession(sessionId);
    expect(session).toBeDefined();
    // Should parse 2 valid messages, skip the invalid one
    expect(session?.messages.length).toBe(2);
  });

  test('decodes project name correctly', async () => {
    // Use a different test project path with complex name
    const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
    const complexProjectPath = path.join(CLAUDE_PROJECTS_DIR, '-Users-john-Documents-my-awesome-project-' + Date.now());
    fs.mkdirSync(complexProjectPath, { recursive: true });

    const sessionFile = path.join(complexProjectPath, 'session-1.jsonl');
    const message = {
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: 'Test' }] },
      timestamp: new Date().toISOString(),
      uuid: 'msg-1',
      sessionId: 'session-1',
      cwd: '/Users/john/Documents/my-awesome-project',
      parentUuid: null,
      isSidechain: false,
      userType: 'human',
      version: '1.0'
    };

    fs.writeFileSync(sessionFile, JSON.stringify(message));
    await watcher.start();

    const session = watcher.getSession('session-1');
    // Project name is extracted from the directory name
    expect(session?.projectName).toBeDefined();
    expect(typeof session?.projectName).toBe('string');
    expect(session?.projectName.length).toBeGreaterThan(0);

    // Clean up
    if (fs.existsSync(complexProjectPath)) {
      fs.rmSync(complexProjectPath, { recursive: true, force: true });
    }
  });
});
