#!/bin/bash
# Ship Reset - 브랜치를 base로 soft reset
# Usage: ./reset.sh [--force]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../commands/ship/env"

# 브랜치 정보 추출
extract_branch_info

echo "$LOG_PHASE Reset to base..."

# Base commit 찾기
BASE_COMMIT=$(git merge-base main HEAD)
CURRENT_COMMIT=$(git rev-parse HEAD)

if [ "$BASE_COMMIT" = "$CURRENT_COMMIT" ]; then
    echo "$LOG_SUCCESS Already at base. No commits to reset."
    exit 0
fi

# Reset할 커밋 목록 표시
COMMITS_TO_RESET=$(git rev-list --count $BASE_COMMIT..HEAD)
echo ""
echo "📋 Commits to reset ($COMMITS_TO_RESET):"
git log --oneline $BASE_COMMIT..HEAD | sed 's/^/   /'
echo ""

# Force 옵션 확인
if [ "$1" != "--force" ]; then
    echo "⚠️  This will soft reset $COMMITS_TO_RESET commit(s)."
    echo "   Changes will be staged (not lost)."
    echo ""
    read -p "Continue? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "$LOG_ERROR Reset cancelled."
        exit 1
    fi
fi

# Soft reset 실행
git reset --soft "$BASE_COMMIT"

echo ""
echo "$LOG_SUCCESS Reset completed!"
echo ""
echo "📊 Status:"
echo "   Base commit: ${BASE_COMMIT:0:7}"
echo "   Changes are now staged."
echo ""
echo "$LOG_NEXT Next: Review staged changes with 'git status'"
