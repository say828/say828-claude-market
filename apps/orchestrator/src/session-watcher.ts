import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Session, SessionMessage, PendingHook, ProjectSessions } from './types';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export class SessionWatcher {
  private projects: Map<string, ProjectSessions> = new Map();
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private filePositions: Map<string, number> = new Map();
  private onUpdate: (sessions: Session[]) => void;
  private onHookAlert?: (sessionId: string, sessionName: string, hook: PendingHook) => void;
  private pollInterval: NodeJS.Timeout | null = null;
  private seenHooks: Map<string, string> = new Map(); // sessionId -> hookId (toolUseId)

  constructor(onUpdate: (sessions: Session[]) => void, onHookAlert?: (sessionId: string, sessionName: string, hook: PendingHook) => void) {
    this.onUpdate = onUpdate;
    this.onHookAlert = onHookAlert;
  }

  async start(): Promise<void> {
    // Initial scan
    await this.scanProjects();

    // Watch for new projects
    if (fs.existsSync(CLAUDE_PROJECTS_DIR)) {
      const watcher = fs.watch(CLAUDE_PROJECTS_DIR, (eventType, filename) => {
        if (filename && eventType === 'rename') {
          this.scanProjects();
        }
      });
      this.fileWatchers.set('root', watcher);
    }

    // Poll for file changes (more reliable than fs.watch for content)
    this.pollInterval = setInterval(() => this.pollSessions(), 1000);
  }

  stop(): void {
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    this.fileWatchers.clear();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private async scanProjects(): Promise<void> {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
      return;
    }

    const entries = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const projectPath = path.join(CLAUDE_PROJECTS_DIR, entry.name);
        await this.scanProjectSessions(entry.name, projectPath);
      }
    }

    this.notifyUpdate();
  }

  private async scanProjectSessions(projectName: string, projectPath: string): Promise<void> {
    const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));

    const sessions: Session[] = [];

    for (const file of files) {
      const filePath = path.join(projectPath, file);
      const sessionId = file.replace('.jsonl', '');

      const session = await this.parseSessionFile(sessionId, filePath, projectName, projectPath);
      if (session) {
        sessions.push(session);
      }
    }

    // Sort by last activity
    sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    this.projects.set(projectPath, {
      projectPath,
      projectName: this.decodeProjectName(projectName),
      sessions
    });
  }

  private decodeProjectName(encoded: string): string {
    // Convert -Users-say-Documents-GitHub-project to project
    const parts = encoded.split('-').filter(Boolean);
    return parts[parts.length - 1] || encoded;
  }

  private async parseSessionFile(
    sessionId: string,
    filePath: string,
    projectName: string,
    projectPath: string
  ): Promise<Session | null> {
    try {
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      // Store position for incremental updates
      this.filePositions.set(filePath, stat.size);

      const messages: SessionMessage[] = [];
      let cwd = '';
      let gitBranch = '';
      let lastTimestamp = new Date(0);

      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as SessionMessage;
          messages.push(msg);

          if (msg.cwd) cwd = msg.cwd;
          if (msg.gitBranch) gitBranch = msg.gitBranch;
          if (msg.timestamp) {
            const ts = new Date(msg.timestamp);
            if (ts > lastTimestamp) lastTimestamp = ts;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      if (messages.length === 0) return null;

      // Check for pending hooks
      const pendingHook = this.detectPendingHook(messages);

      // Determine status
      const now = Date.now();
      const lastActivityMs = lastTimestamp.getTime();
      const idleThreshold = 5 * 60 * 1000; // 5 minutes

      let status: 'active' | 'idle' | 'pending_hook' = 'idle';
      if (pendingHook) {
        status = 'pending_hook';
      } else if (now - lastActivityMs < idleThreshold) {
        status = 'active';
      }

      return {
        id: sessionId,
        projectPath,
        projectName: this.decodeProjectName(projectName),
        filePath,
        cwd,
        gitBranch,
        lastActivity: lastTimestamp,
        messageCount: messages.filter(m => m.type === 'user' || m.type === 'assistant').length,
        status,
        pendingHook,
        messages
      };
    } catch (err) {
      console.error(`Error parsing session ${sessionId}:`, err);
      return null;
    }
  }

  private detectPendingHook(messages: SessionMessage[]): PendingHook | undefined {
    // Find the last tool_use that doesn't have a corresponding tool_result
    const toolUses: Map<string, { name: string; input: Record<string, unknown>; timestamp: string }> = new Map();
    const toolResults: Set<string> = new Set();

    for (const msg of messages) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const content of msg.message.content) {
          if (content.type === 'tool_use') {
            toolUses.set(content.id, {
              name: content.name,
              input: content.input,
              timestamp: msg.timestamp
            });
          } else if (content.type === 'tool_result') {
            toolResults.add(content.tool_use_id);
          }
        }
      }
    }

    // Find pending tool uses (hooks that need response)
    const hookTools = ['Bash', 'Edit', 'Write', 'AskUserQuestion'];

    for (const [id, tool] of toolUses) {
      if (!toolResults.has(id) && hookTools.includes(tool.name)) {
        const hookType = tool.name === 'AskUserQuestion' ? 'question' :
                        tool.name === 'Bash' ? 'bash' : 'edit';
        return {
          type: hookType,
          toolUseId: id,
          toolName: tool.name,
          input: tool.input,
          timestamp: new Date(tool.timestamp)
        };
      }
    }

    return undefined;
  }

  private async pollSessions(): Promise<void> {
    let hasChanges = false;

    for (const [projectPath, project] of this.projects) {
      for (const session of project.sessions) {
        try {
          const stat = fs.statSync(session.filePath);
          const lastPos = this.filePositions.get(session.filePath) || 0;

          if (stat.size > lastPos) {
            // File has new content
            hasChanges = true;
            await this.updateSession(session, lastPos, stat.size);
            this.filePositions.set(session.filePath, stat.size);
          }
        } catch {
          // File may have been deleted
        }
      }
    }

    // Also check for new session files
    for (const [projectPath] of this.projects) {
      const projectName = path.basename(projectPath);
      const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
      const existingIds = new Set(this.projects.get(projectPath)?.sessions.map(s => s.id));

      for (const file of files) {
        const sessionId = file.replace('.jsonl', '');
        if (!existingIds.has(sessionId)) {
          hasChanges = true;
          await this.scanProjectSessions(projectName, projectPath);
          break;
        }
      }
    }

    if (hasChanges) {
      this.notifyUpdate();
    }
  }

  private async updateSession(session: Session, startPos: number, endPos: number): Promise<void> {
    const fd = fs.openSync(session.filePath, 'r');
    const buffer = Buffer.alloc(endPos - startPos);
    fs.readSync(fd, buffer, 0, buffer.length, startPos);
    fs.closeSync(fd);

    const newContent = buffer.toString('utf-8');
    const newLines = newContent.trim().split('\n').filter(Boolean);

    for (const line of newLines) {
      try {
        const msg = JSON.parse(line) as SessionMessage;
        session.messages.push(msg);

        if (msg.timestamp) {
          const ts = new Date(msg.timestamp);
          if (ts > session.lastActivity) {
            session.lastActivity = ts;
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    // Update message count
    session.messageCount = session.messages.filter(
      m => m.type === 'user' || m.type === 'assistant'
    ).length;

    // Update pending hook
    const oldHookId = this.seenHooks.get(session.id);
    session.pendingHook = this.detectPendingHook(session.messages);

    // Check for NEW hook and emit alert
    if (session.pendingHook) {
      const newHookId = session.pendingHook.toolUseId;
      if (oldHookId !== newHookId && this.onHookAlert) {
        this.seenHooks.set(session.id, newHookId);
        this.onHookAlert(session.id, session.projectName, session.pendingHook);
      }
    } else {
      // Hook cleared, remove from seen
      this.seenHooks.delete(session.id);
    }

    // Update status
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000;

    if (session.pendingHook) {
      session.status = 'pending_hook';
    } else if (now - session.lastActivity.getTime() < idleThreshold) {
      session.status = 'active';
    } else {
      session.status = 'idle';
    }
  }

  private notifyUpdate(): void {
    const allSessions: Session[] = [];
    for (const project of this.projects.values()) {
      allSessions.push(...project.sessions);
    }
    allSessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    this.onUpdate(allSessions);
  }

  getAllSessions(): Session[] {
    const allSessions: Session[] = [];
    for (const project of this.projects.values()) {
      allSessions.push(...project.sessions);
    }
    return allSessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  getSession(sessionId: string): Session | undefined {
    for (const project of this.projects.values()) {
      const session = project.sessions.find(s => s.id === sessionId);
      if (session) return session;
    }
    return undefined;
  }

  getStats(): { totalSessions: number; activeSessions: number; pendingHooks: number; projectCount: number } {
    const allSessions = this.getAllSessions();
    return {
      totalSessions: allSessions.length,
      activeSessions: allSessions.filter(s => s.status === 'active').length,
      pendingHooks: allSessions.filter(s => s.status === 'pending_hook').length,
      projectCount: this.projects.size
    };
  }

  deleteSession(sessionId: string): boolean {
    for (const [projectPath, project] of this.projects) {
      const sessionIndex = project.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        const session = project.sessions[sessionIndex];
        try {
          // Delete the JSONL file
          if (fs.existsSync(session.filePath)) {
            fs.unlinkSync(session.filePath);
          }
          // Also delete any associated scratchpad directory
          const scratchpadDir = session.filePath.replace('.jsonl', '');
          if (fs.existsSync(scratchpadDir) && fs.statSync(scratchpadDir).isDirectory()) {
            fs.rmSync(scratchpadDir, { recursive: true });
          }
          // Remove from memory
          project.sessions.splice(sessionIndex, 1);
          this.filePositions.delete(session.filePath);
          this.seenHooks.delete(sessionId);
          // Notify update
          this.notifyUpdate();
          return true;
        } catch (err) {
          console.error(`Failed to delete session ${sessionId}:`, err);
          return false;
        }
      }
    }
    return false;
  }
}
