#!/bin/bash
# validate-commit.sh - 커밋 메시지 컨벤션 검증 (PostToolUse hook)
#
# 트리거: git commit 실행 후
# 목적: 커밋 메시지가 컨벤션을 따르는지 검증
# 동작: 경고만 출력 (블로킹 안 함)

# 마지막 커밋 메시지 가져오기
COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null | head -1)

if [ -z "$COMMIT_MSG" ]; then
    exit 0
fi

# 컨벤션 패턴: [KT-XXXXX] 또는 [NO-T]로 시작
if echo "$COMMIT_MSG" | grep -qE '^\[(KT-[0-9]+|NO-T)\]'; then
    # 컨벤션 준수
    exit 0
fi

# 컨벤션 위반 경고
echo ""
echo "⚠️  커밋 메시지 컨벤션 경고"
echo "   현재: $COMMIT_MSG"
echo "   형식: [KT-XXXXX] 또는 [NO-T]로 시작해야 합니다"
echo ""
echo "   예시:"
echo "   - [KT-11508] UserService에 validate 메서드를 추가한다"
echo "   - [NO-T] NhnResultCodeConverter를 구현한다"
echo ""
echo "   📋 'ship:plan' → 'ship:step' 워크플로우를 사용하면 자동으로 컨벤션을 준수합니다"
echo ""

# 경고만 출력, 블로킹하지 않음
exit 0
