#!/bin/bash
# Analyze Diff - Git 변경사항 분석
# Usage: ./analyze_diff.sh [base_branch]
# Output: JSON format analysis

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../commands/ship/env"

BASE="${1:-main}"

# 변경된 파일 목록 (staged + unstaged + untracked)
get_changed_files() {
    # staged/unstaged 변경사항 (git status에서 ?? 제외)
    git status --porcelain 2>/dev/null | while IFS= read -r line; do
        [ -z "$line" ] && continue
        status="${line:0:2}"
        path="${line:3}"

        # untracked(??)는 별도 처리
        [ "$status" = "??" ] && continue

        # 상태 코드 변환
        case "$status" in
            "M "|" M"|"MM") echo -e "M\t$path" ;;
            "A "|" A"|"AM") echo -e "A\t$path" ;;
            "D "|" D"|"DD") echo -e "D\t$path" ;;
            "R "*) echo -e "R\t${path#* -> }" ;;
            *) [ -n "$path" ] && echo -e "M\t$path" ;;
        esac
    done

    # untracked 파일 (git ls-files로 개별 파일 목록)
    git ls-files --others --exclude-standard 2>/dev/null | while read -r file; do
        [ -f "$file" ] && echo -e "A\t$file"
    done
}

# 파일별 라인 수 통계 (staged + unstaged + untracked)
get_file_stats() {
    # staged 변경사항
    git diff --cached --numstat 2>/dev/null
    # unstaged 변경사항
    git diff --numstat 2>/dev/null
    # untracked 파일 (새 파일) - wc -l로 라인 수 계산
    git ls-files --others --exclude-standard 2>/dev/null | while read -r file; do
        [ -f "$file" ] && lines=$(wc -l < "$file" | tr -d ' ') && echo -e "${lines}\t0\t${file}"
    done
}

# 모듈 추출
get_module() {
    local path="$1"
    echo "$path" | cut -d'/' -f1
}

# 테스트 파일 여부
is_test_file() {
    local path="$1"
    [[ "$path" == *"test"* ]] || [[ "$path" == *"Test"* ]]
}

# JSON 출력 시작
echo "{"

# 파일 목록 수집
echo '  "files": ['
FIRST=true
while IFS=$'\t' read -r status path; do
    [ -z "$path" ] && continue

    MODULE=$(get_module "$path")
    IS_TEST=$(is_test_file "$path" && echo "true" || echo "false")

    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ","
    fi

    printf '    {"path": "%s", "status": "%s", "module": "%s", "is_test": %s}' \
        "$path" "$status" "$MODULE" "$IS_TEST"
done < <(get_changed_files)
echo ""
echo "  ],"

# 통계 수집
TOTAL_ADD=0
TOTAL_DEL=0
TOTAL_ADD_NON_TEST=0
TOTAL_DEL_NON_TEST=0
FILE_COUNT=0
FILE_COUNT_NON_TEST=0

while IFS=$'\t' read -r add del path; do
    [ -z "$path" ] && continue
    [ "$add" = "-" ] && add=0
    [ "$del" = "-" ] && del=0

    TOTAL_ADD=$((TOTAL_ADD + add))
    TOTAL_DEL=$((TOTAL_DEL + del))
    FILE_COUNT=$((FILE_COUNT + 1))

    if ! is_test_file "$path"; then
        TOTAL_ADD_NON_TEST=$((TOTAL_ADD_NON_TEST + add))
        TOTAL_DEL_NON_TEST=$((TOTAL_DEL_NON_TEST + del))
        FILE_COUNT_NON_TEST=$((FILE_COUNT_NON_TEST + 1))
    fi
done < <(get_file_stats)

# 통계 출력
echo '  "stats": {'
echo "    \"total_additions\": $TOTAL_ADD,"
echo "    \"total_deletions\": $TOTAL_DEL,"
echo "    \"total_lines\": $((TOTAL_ADD + TOTAL_DEL)),"
echo "    \"file_count\": $FILE_COUNT"
echo "  },"

# 테스트 제외 통계
echo '  "non_test_stats": {'
echo "    \"additions\": $TOTAL_ADD_NON_TEST,"
echo "    \"deletions\": $TOTAL_DEL_NON_TEST,"
echo "    \"total_lines\": $((TOTAL_ADD_NON_TEST + TOTAL_DEL_NON_TEST)),"
echo "    \"file_count\": $FILE_COUNT_NON_TEST"
echo "  },"

# 모듈별 통계 (bash 3.2 호환 - awk 사용)
echo '  "modules": {'
MODULE_JSON=$(get_file_stats | awk -F'\t' '
    $3 != "" {
        add = ($1 == "-") ? 0 : $1
        del = ($2 == "-") ? 0 : $2
        split($3, parts, "/")
        module = parts[1]
        modules[module] += add + del
        count++
    }
    END {
        first = 1
        for (m in modules) {
            if (!first) printf ","
            printf "\n    \"%s\": %d", m, modules[m]
            first = 0
        }
        print ""
        print "MODULE_COUNT=" NR > "/dev/stderr"
    }
' 2>&1)

# 모듈 카운트 추출
MODULE_COUNT=$(echo "$MODULE_JSON" | grep "MODULE_COUNT=" | cut -d'=' -f2)
MODULE_JSON=$(echo "$MODULE_JSON" | grep -v "MODULE_COUNT=")
echo "$MODULE_JSON"
echo "  },"

# 분할 필요 여부 판단
NEEDS_SPLIT=false
SPLIT_REASON=""

NON_TEST_TOTAL=$((TOTAL_ADD_NON_TEST + TOTAL_DEL_NON_TEST))
if [ "$NON_TEST_TOTAL" -gt "$PR_MAX_LINES" ]; then
    NEEDS_SPLIT=true
    SPLIT_REASON="size_exceeds_${PR_MAX_LINES}_lines"
fi

# 고유 모듈 수 계산 (bash 3.2 호환)
MODULE_COUNT=$(get_file_stats | awk -F'\t' '$3 != "" { split($3, p, "/"); print p[1] }' | sort -u | wc -l | tr -d ' ')
if [ "$MODULE_COUNT" -gt 3 ]; then
    NEEDS_SPLIT=true
    SPLIT_REASON="${SPLIT_REASON:+$SPLIT_REASON,}too_many_modules"
fi

echo '  "split_decision": {'
echo "    \"should_split\": $NEEDS_SPLIT,"
echo "    \"reason\": \"$SPLIT_REASON\","
echo "    \"non_test_lines\": $NON_TEST_TOTAL,"
echo "    \"max_allowed\": $PR_MAX_LINES,"
echo "    \"module_count\": $MODULE_COUNT"
echo "  }"

echo "}"
