#!/usr/bin/env bun
/**
 * Test server to preview all UI views
 * Usage: bun test-server.ts [view-type]
 * Views: plan, bash, edit, question, stop, subagent-stop, post-tool
 */

import { readFileSync } from 'fs';

const html = readFileSync('./packages/ui/dist/index.html', 'utf-8');

const viewType = process.argv[2] || 'bash';

const mockContexts: Record<string, any> = {
  plan: {
    type: 'plan',
    plan: `# Implementation Plan

## Overview
This plan outlines the implementation of a new authentication system.

## Tasks

### 1. Setup Database Schema
- Create users table
- Add sessions table
- Setup migrations

### 2. Implement Auth Endpoints
\`\`\`typescript
// POST /api/auth/login
async function login(req: Request) {
  const { email, password } = await req.json();
  // Validate credentials
  const user = await db.users.findByEmail(email);
  if (!user || !verifyPassword(password, user.hash)) {
    throw new Error('Invalid credentials');
  }
  return createSession(user.id);
}
\`\`\`

### 3. Add Middleware
- JWT validation
- Rate limiting
- CORS configuration

## Timeline
- Phase 1: Database setup (Day 1)
- Phase 2: Auth endpoints (Day 2-3)
- Phase 3: Testing & deployment (Day 4)
`,
    permissionMode: 'plan'
  },

  bash: {
    type: 'bash',
    command: 'rm -rf node_modules && bun install && bun run build',
    description: 'Clean install dependencies and rebuild the project',
    cwd: '/Users/say/Documents/GitHub/yourturn',
    timeout: 300000,
    riskLevel: 'caution'
  },

  'bash-dangerous': {
    type: 'bash',
    command: 'sudo rm -rf /var/log/*',
    description: 'Clear all system logs',
    cwd: '/var/log',
    timeout: 60000,
    riskLevel: 'dangerous'
  },

  'bash-safe': {
    type: 'bash',
    command: 'ls -la && pwd && whoami',
    description: 'List files and show current directory',
    cwd: '/Users/say/Documents/GitHub/yourturn',
    timeout: 30000,
    riskLevel: 'safe'
  },

  edit: {
    type: 'edit',
    filePath: '/Users/say/Documents/GitHub/yourturn/src/utils/auth.ts',
    oldContent: `export function validateToken(token: string): boolean {
  if (!token) return false;
  // Basic validation
  return token.length > 10;
}`,
    newContent: `export function validateToken(token: string): boolean {
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return !!decoded;
  } catch {
    return false;
  }
}`,
    isNew: false,
    toolName: 'Edit'
  },

  'edit-new': {
    type: 'edit',
    filePath: '/Users/say/Documents/GitHub/yourturn/src/config/database.ts',
    oldContent: null,
    newContent: `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client);

export default db;`,
    isNew: true,
    toolName: 'Write'
  },

  question: {
    type: 'question',
    questions: [
      {
        question: 'Which authentication method should we use?',
        header: 'Auth Method',
        options: [
          { label: 'JWT Tokens', description: 'Stateless, scalable, good for APIs' },
          { label: 'Session Cookies', description: 'Traditional, secure, server-side state' },
          { label: 'OAuth 2.0', description: 'Third-party auth, social logins' }
        ],
        multiSelect: false
      }
    ]
  },

  'question-multi': {
    type: 'question',
    questions: [
      {
        question: 'Which features should we enable?',
        header: 'Features',
        options: [
          { label: 'Two-Factor Auth', description: 'SMS or TOTP-based 2FA' },
          { label: 'Password Reset', description: 'Email-based password recovery' },
          { label: 'Remember Me', description: 'Extended session duration' },
          { label: 'Account Lockout', description: 'Lock after failed attempts' }
        ],
        multiSelect: true
      }
    ]
  },

  stop: {
    type: 'stop',
    reason: 'Task completed successfully',
    sessionId: 'session-abc123def456',
    summary: 'Successfully implemented the authentication system with JWT tokens, added password reset functionality, and configured rate limiting middleware.'
  },

  'subagent-stop': {
    type: 'subagent-stop',
    subagentName: 'CodeReviewer',
    result: `Code review completed:
✓ No security vulnerabilities found
✓ Code follows best practices
✓ All tests passing
⚠ Consider adding input validation for email field`,
    sessionId: 'session-abc123def456'
  },

  'post-tool': {
    type: 'post-tool',
    toolName: 'Bash',
    toolInput: { command: 'bun test', timeout: 60000 },
    toolOutput: `bun test v1.0.0
Running 24 tests...

✓ auth.test.ts (8 tests) [1.2s]
✓ user.test.ts (10 tests) [0.8s]
✓ api.test.ts (6 tests) [0.5s]

All tests passed!`,
    error: null,
    success: true
  },

  'post-tool-error': {
    type: 'post-tool',
    toolName: 'Bash',
    toolInput: { command: 'bun test', timeout: 60000 },
    toolOutput: null,
    error: `Error: Test failed
  at auth.test.ts:45
  Expected: true
  Received: false`,
    success: false
  }
};

const context = mockContexts[viewType];

if (!context) {
  console.log('Available views:');
  Object.keys(mockContexts).forEach(k => console.log(`  - ${k}`));
  process.exit(1);
}

const server = Bun.serve({
  port: 3333,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/context') {
      return Response.json(context);
    }

    if (url.pathname === '/api/approve') {
      console.log('✅ Approved!');
      return Response.json({ success: true });
    }

    if (url.pathname === '/api/deny') {
      console.log('❌ Denied!');
      return Response.json({ success: true });
    }

    if (url.pathname === '/api/answer') {
      console.log('📝 Answer submitted');
      return Response.json({ success: true });
    }

    if (url.pathname === '/api/acknowledge') {
      console.log('👍 Acknowledged');
      return Response.json({ success: true });
    }

    if (url.pathname === '/api/plan-decision') {
      return (async () => {
        const body = await req.json().catch(() => ({})) as any;
        console.log(`📋 Plan Decision: ${body.decision}`);
        if (body.feedback) {
          console.log(`   Feedback: ${body.feedback}`);
        }
        return Response.json({ success: true });
      })();
    }

    if (url.pathname === '/api/stop-decision') {
      return (async () => {
        const body = await req.json().catch(() => ({})) as any;
        console.log(`🛑 Stop Decision: ${body.action}`);
        if (body.prompt) {
          console.log(`   Prompt: ${body.prompt}`);
        }
        return Response.json({ success: true });
      })();
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

console.log(`\n🎨 yourturn UI Preview`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`View: ${viewType}`);
console.log(`URL:  http://localhost:${server.port}`);
console.log(`\nAvailable views:`);
Object.keys(mockContexts).forEach(k => {
  console.log(`  bun test-server.ts ${k}`);
});
console.log(`\nPress Ctrl+C to stop\n`);
