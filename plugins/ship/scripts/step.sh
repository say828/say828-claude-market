#!/bin/bash
# Ship Step - 계획된 커밋 순차 적용 및 검증
# Usage: ./step.sh
# - Plan 파일에서 첫 번째 커밋을 적용
# - 빌드/테스트 성공 시 plan에서 제거
# - 실패 시 soft reset 후 안내

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../commands/ship/env"

PLAN_FILE="$SCRIPT_DIR/.plan.json"

echo "$LOG_PHASE Ship Step - 순차 커밋 적용"
echo ""

# ===== Pre-validation =====

# 1. Plan 파일 확인
if [ ! -f "$PLAN_FILE" ]; then
    echo "$LOG_ERROR No plan found."
    echo ""
    echo "$LOG_REFERENCE Run 'ship:plan' first to create a commit plan."
    exit 1
fi

# 2. jq 확인
if ! command -v jq &> /dev/null; then
    echo "$LOG_ERROR jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

# 3. 부모 브랜치 검증
CURRENT_BRANCH=$(git branch --show-current)
PARENT_BRANCH=$(jq -r '.parent_branch' "$PLAN_FILE")

if [ "$CURRENT_BRANCH" != "$PARENT_BRANCH" ]; then
    echo "$LOG_ERROR Wrong branch!"
    echo ""
    echo "   Current:  $CURRENT_BRANCH"
    echo "   Expected: $PARENT_BRANCH"
    echo ""
    echo "$LOG_NEXT Run: git checkout $PARENT_BRANCH"
    exit 1
fi

# 4. 커밋 개수 확인
COMMIT_COUNT=$(jq '.commits | length' "$PLAN_FILE")

if [ "$COMMIT_COUNT" -eq 0 ]; then
    echo "$LOG_SUCCESS All commits have been applied!"
    echo ""
    echo "$LOG_NEXT Next: Push changes with 'git push' or run 'ship:task'"
    rm -f "$PLAN_FILE"
    exit 0
fi

# 5. 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
    echo "$LOG_ERROR No changes found."
    echo ""
    echo "$LOG_REFERENCE Check 'git status' for pending changes."
    exit 1
fi

# ===== Phase 1: 첫 번째 커밋 정보 추출 =====

echo "$LOG_PHASE Extracting first commit from plan..."
echo ""

COMMIT_MSG=$(jq -r '.commits[0].message' "$PLAN_FILE")
FILES=$(jq -r '.commits[0].files[]' "$PLAN_FILE")

echo "$LOG_REFERENCE Commit: $COMMIT_MSG"
echo "$LOG_REFERENCE Files:"
echo "$FILES" | sed 's/^/   - /'
echo ""

# ===== Phase 2: 커밋 생성 =====

echo "$LOG_PHASE Creating commit..."

# 모든 변경사항 unstage
git reset HEAD > /dev/null 2>&1 || true

# 해당 파일들만 staging
STAGED_COUNT=0
while IFS= read -r file; do
    if [ -n "$file" ]; then
        if [ -e "$file" ]; then
            git add "$file"
            STAGED_COUNT=$((STAGED_COUNT + 1))
        else
            # 삭제된 파일
            git add "$file" 2>/dev/null || true
            STAGED_COUNT=$((STAGED_COUNT + 1))
        fi
    fi
done <<< "$FILES"

if [ "$STAGED_COUNT" -eq 0 ]; then
    echo "$LOG_WARNING No files to stage for this commit."
    echo ""
    echo "$LOG_NEXT Skipping to next commit..."

    # Plan에서 첫 번째 커밋 제거
    jq '.commits = .commits[1:]' "$PLAN_FILE" > "$PLAN_FILE.tmp" && mv "$PLAN_FILE.tmp" "$PLAN_FILE"

    REMAINING=$((COMMIT_COUNT - 1))
    echo "$LOG_REFERENCE Remaining: $REMAINING commit(s)"
    exit 0
fi

# 커밋 생성
if [ -z "$(git diff --cached --name-only)" ]; then
    echo "$LOG_WARNING No staged changes. Skipping commit."
    jq '.commits = .commits[1:]' "$PLAN_FILE" > "$PLAN_FILE.tmp" && mv "$PLAN_FILE.tmp" "$PLAN_FILE"
    exit 0
fi

git commit -m "$COMMIT_MSG"
COMMIT_SHA=$(git rev-parse --short HEAD)

echo "   $LOG_SUCCESS Created: $COMMIT_SHA - $COMMIT_MSG"
echo ""

# ===== Phase 3: 빌드/테스트 검증 =====

echo "$LOG_PHASE Running build and tests..."
echo ""

BUILD_SUCCESS=true
BUILD_OUTPUT=""

# 빌드 실행 (테스트 포함)
if ! BUILD_OUTPUT=$(./gradlew build 2>&1); then
    BUILD_SUCCESS=false
fi

if [ "$BUILD_SUCCESS" = true ]; then
    # ===== 성공 =====
    echo "$LOG_SUCCESS BUILD PASSED!"
    echo ""

    # Plan에서 첫 번째 커밋 제거
    jq '.commits = .commits[1:]' "$PLAN_FILE" > "$PLAN_FILE.tmp" && mv "$PLAN_FILE.tmp" "$PLAN_FILE"

    REMAINING=$((COMMIT_COUNT - 1))

    echo "$LOG_PACKAGE Created commit:"
    echo "   $COMMIT_SHA - $COMMIT_MSG"
    echo ""
    echo "$LOG_REFERENCE Remaining: $REMAINING commit(s)"
    echo ""

    if [ "$REMAINING" -gt 0 ]; then
        echo "$LOG_NEXT Next: Run 'ship:step' to apply next commit"
    else
        echo "$LOG_SUCCESS All commits applied!"
        echo "$LOG_NEXT Next: Push changes with 'git push' or run 'ship:task'"
        rm -f "$PLAN_FILE"
    fi
else
    # ===== 실패 =====
    echo "$LOG_ERROR BUILD FAILED!"
    echo ""

    # 빌드 실패 원인 출력 (마지막 30줄)
    echo "$LOG_REFERENCE Build output (last 30 lines):"
    echo "$BUILD_OUTPUT" | tail -30 | sed 's/^/   /'
    echo ""

    # Soft reset
    echo "🔄 Rolling back commit..."
    git reset --soft HEAD~1
    git reset HEAD > /dev/null 2>&1 || true

    echo ""
    echo "$LOG_SUCCESS Rollback completed."
    echo "   Changes are now unstaged."
    echo ""

    # Plan 파일 삭제 (재계획 필요)
    rm -f "$PLAN_FILE"

    echo "$LOG_NEXT Next steps:"
    echo "   1. Fix the build/test errors"
    echo "   2. Run 'ship:plan' to re-plan commits"
    echo "   3. Run 'ship:step' to try again"

    exit 1
fi
