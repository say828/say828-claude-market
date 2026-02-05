import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import * as webSession from '../web-session';
import type { WebSession, WebSessionMessage } from '../web-session';

describe('WebSession', () => {
  let messages: WebSessionMessage[] = [];
  let session: WebSession | undefined;

  beforeEach(() => {
    messages = [];
  });

  afterEach(() => {
    if (session) {
      webSession.stopWebSession(session.id);
    }
  });

  test('creates web session with unique ID', () => {
    const session1 = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );
    const session2 = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    expect(session1.id).toBeDefined();
    expect(session2.id).toBeDefined();
    expect(session1.id).not.toBe(session2.id);

    webSession.stopWebSession(session1.id);
    webSession.stopWebSession(session2.id);
  });

  test('creates web session with resume ID', () => {
    const resumeId = 'existing-session-123';
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg),
      resumeId
    );

    expect(session.id).toBe(resumeId);
  });

  test('extracts project name from cwd', () => {
    session = webSession.createWebSession(
      '/Users/john/projects/my-app',
      (msg) => messages.push(msg)
    );

    expect(session.projectName).toBe('my-app');
  });

  test('initializes with starting status', () => {
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    expect(session.status).toBe('starting');
  });

  test('stores session in registry', () => {
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    const retrieved = webSession.getWebSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
  });

  test('getAllWebSessions returns all sessions', () => {
    const session1 = webSession.createWebSession('/tmp/test1', (msg) => {});
    const session2 = webSession.createWebSession('/tmp/test2', (msg) => {});

    const allSessions = webSession.getAllWebSessions();
    expect(allSessions.length).toBeGreaterThanOrEqual(2);

    const ids = allSessions.map(s => s.id);
    expect(ids).toContain(session1.id);
    expect(ids).toContain(session2.id);

    webSession.stopWebSession(session1.id);
    webSession.stopWebSession(session2.id);
  });

  test('stopWebSession removes session from registry', () => {
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    const sessionId = session.id;
    expect(webSession.getWebSession(sessionId)).toBeDefined();

    const stopped = webSession.stopWebSession(sessionId);
    expect(stopped).toBe(true);
    expect(webSession.getWebSession(sessionId)).toBeUndefined();

    session = undefined; // Prevent afterEach from trying to stop again
  });

  test('stopWebSession returns false for non-existent session', () => {
    const stopped = webSession.stopWebSession('non-existent-id');
    expect(stopped).toBe(false);
  });

  test('sendMessage returns false for non-existent session', async () => {
    const result = await webSession.sendMessage('non-existent-id', 'test message');
    expect(result).toBe(false);
  });

  test('sendPermissionResponse returns false for non-existent session', async () => {
    const result = await webSession.sendPermissionResponse(
      'non-existent-id',
      'tool-use-id',
      true
    );
    expect(result).toBe(false);
  });

  test('sendControlSignal returns false for non-existent session', async () => {
    const result = await webSession.sendControlSignal('non-existent-id', 'interrupt');
    expect(result).toBe(false);
  });

  test('session has empty buffer initially', () => {
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    expect(session.buffer).toBe('');
  });

  test('session stores cwd correctly', () => {
    const testCwd = '/Users/test/project/dir';
    session = webSession.createWebSession(
      testCwd,
      (msg) => messages.push(msg)
    );

    expect(session.cwd).toBe(testCwd);
  });

  test('session starts with no pending permission', () => {
    session = webSession.createWebSession(
      '/tmp/test',
      (msg) => messages.push(msg)
    );

    expect(session.pendingPermission).toBeUndefined();
  });

  test('multiple sessions can coexist', () => {
    const session1 = webSession.createWebSession('/tmp/test1', (msg) => {});
    const session2 = webSession.createWebSession('/tmp/test2', (msg) => {});
    const session3 = webSession.createWebSession('/tmp/test3', (msg) => {});

    expect(webSession.getWebSession(session1.id)).toBeDefined();
    expect(webSession.getWebSession(session2.id)).toBeDefined();
    expect(webSession.getWebSession(session3.id)).toBeDefined();

    webSession.stopWebSession(session1.id);
    webSession.stopWebSession(session2.id);
    webSession.stopWebSession(session3.id);
  });
});
