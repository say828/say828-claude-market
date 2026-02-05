#!/bin/bash
# validate-branch.sh - 브랜치 네이밍 컨벤션 검증 (SessionStart hook)
#
# 트리거: Claude Code 세션 시작 시
# 목적: 현재 브랜치가 태스크 브랜치 컨벤션을 따르는지 확인
# 동작: 안내만 출력 (블로킹 안 함)

# Git 저장소인지 확인
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    exit 0
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

if [ -z "$CURRENT_BRANCH" ]; then
    exit 0
fi

# main/master 브랜치면 안내
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo ""
    echo "📋 Ship 워크플로우 안내"
    echo "   현재 브랜치: $CURRENT_BRANCH"
    echo ""
    echo "   작업 시작 전 태스크 브랜치를 생성하세요:"
    echo "   $ git checkout -b {username}/KT-{TASK_ID}"
    echo ""
    exit 0
fi

# 브랜치 네이밍 패턴 검증: {username}/KT-{TASK_ID}
if echo "$CURRENT_BRANCH" | grep -qE '^[a-z]+/KT-[0-9]+$'; then
    # 컨벤션 준수 - 조용히 통과
    exit 0
fi

# 패턴 불일치 시 경고
echo ""
echo "⚠️  브랜치 네이밍 경고"
echo "   현재: $CURRENT_BRANCH"
echo "   형식: {username}/KT-{TASK_ID}"
echo ""
echo "   예시: say/KT-11508, carter/KT-11509"
echo ""
echo "   📋 ship 커맨드 사용 시 올바른 브랜치 형식이 필요합니다"
echo ""

exit 0
