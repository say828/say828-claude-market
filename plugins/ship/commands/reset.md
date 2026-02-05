---
description: Reset current branch to base (soft reset)
argument-hint: ""
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion, mcp__notion__notion-get-self, TodoWrite
model: claude-sonnet-4-5-20250929
---

# Ship Reset - Reset to Base

## Environment Variables

**Reference:** @env

```bash
source .claude/commands/ship/env
extract_branch_info
```

## Pre-validation

**YOU MUST run these checks before execution:**

1. **Validate current branch naming:**

   ```text
   Check format: ^[a-z]+/KT-[0-9]+$
   If invalid → Exit with error.
   ```

---

## Execution

**스크립트 사용:**

```bash
.claude/scripts/reset.sh [--force]
```

**수동 실행:**

1. Find base: `git merge-base main HEAD`
2. Show commits to be reset
3. Ask user: "Continue? (yes/no)"
4. If yes:

```bash
git reset --soft {base_commit}
```

Show: "✅ Reset completed. Changes are staged."

---

## Error Handling

For ANY error:

1. Show clear error message with ❌
2. Explain what went wrong
3. Reference relevant convention section if applicable
4. Provide remediation steps
5. Exit with error status

## Logging

Use consistent format:

- 🔍 for phase start
- ✅ for success
- ❌ for error
- ⚠️ for warning
