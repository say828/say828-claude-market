# ship:apply - 태스크별 브랜치/커밋/푸시/PR 자동화

태스크 ID 리스트를 받아 각 태스크별로 브랜치 생성, 커밋, 푸시, PR 생성을 자동으로 수행합니다.

## 사용법

```bash
ship:apply KT-12633 KT-12634 KT-12635
```

## 환경 변수

```bash
source "$(dirname "$0")/../env"
```

## 전제 조건

- `.claude/ship/plan.json` 파일 존재 (ship:plan으로 생성됨)
- 태스크 ID 개수와 plan의 그룹 개수가 일치
- git 저장소가 clean 상태 (변경사항이 모두 커밋됨)

## 워크플로우

### Phase 0: 전제 조건 검증

1. **plan.json 확인**

   ```bash
   if [ ! -f ".claude/ship/plan.json" ]; then
     echo "❌ plan.json이 없습니다. ship:plan을 먼저 실행하세요."
     exit 1
   fi
   ```

2. **태스크 ID 개수 확인**

   ```bash
   TASK_IDS=("$@")
   PLAN_GROUPS=$(jq '.groups | length' .claude/ship/plan.json)

   if [ ${#TASK_IDS[@]} -ne $PLAN_GROUPS ]; then
     echo "❌ 태스크 개수가 맞지 않습니다."
     echo "   plan: $PLAN_GROUPS개, 입력: ${#TASK_IDS[@]}개"
     exit 1
   fi
   ```

3. **변경사항 백업**

   ```bash
   # 모든 변경사항을 patch 파일로 백업
   git diff HEAD > .claude/ship/backup.patch
   git diff --cached HEAD >> .claude/ship/backup.patch
   git ls-files --others --exclude-standard | xargs tar czf .claude/ship/untracked.tar.gz
   ```

### Phase 1: 각 태스크 처리 루프

```bash
for i in "${!TASK_IDS[@]}"; do
  TASK_ID="${TASK_IDS[$i]}"
  GROUP_ID=$((i + 1))

  echo ""
  echo "[$((i+1))/${#TASK_IDS[@]}] $TASK_ID 처리 중..."

  # Phase 1-1: 브랜치 생성
  # Phase 1-2: 파일 커밋
  # Phase 1-3: 빌드 검증
  # Phase 1-4: 푸시
  # Phase 1-5: PR 본문 생성
  # Phase 1-6: PR 생성
done
```

### Phase 1-1: 브랜치 생성

```bash
# 1. main 체크아웃 및 최신화
git checkout main
git pull

# 2. 브랜치명 생성
USERNAME=$(jq -r '.username' .claude/ship/plan.json)
BRANCH_NAME="$USERNAME/$TASK_ID"

# 3. 브랜치 생성
git checkout -b "$BRANCH_NAME"

echo "✅ $BRANCH_NAME 브랜치 생성"
```

### Phase 1-2: 파일 커밋

```bash
# 1. plan에서 그룹 정보 로드
GROUP=$(jq ".groups[$i]" .claude/ship/plan.json)
FILES=$(echo "$GROUP" | jq -r '.files[].path')
COMMIT_MSG=$(echo "$GROUP" | jq -r '.commit_message' | sed "s/{TASK_ID}/$TASK_ID/g")

# 2. 백업 patch 적용
git apply .claude/ship/backup.patch
tar xzf .claude/ship/untracked.tar.gz

# 3. 해당 그룹의 파일만 staging
for file in $FILES; do
  git add "$file"
done

# 4. 나머지 파일은 다시 unstage
git diff --cached --name-only | while read staged_file; do
  if ! echo "$FILES" | grep -q "^$staged_file$"; then
    git reset HEAD "$staged_file"
  fi
done

# 5. 커밋 생성
git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✅ 그룹 $GROUP_ID 파일 커밋"
```

### Phase 1-3: 빌드 검증

```bash
# 1. 빌드 명령어 실행
eval "$BUILD_CMD"

if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패"
  echo "   브랜치를 삭제하고 main으로 돌아갑니다."
  git checkout main
  git branch -D "$BRANCH_NAME"
  exit 1
fi

echo "✅ 빌드 검증 완료"
```

### Phase 1-4: 푸시

```bash
# 1. 원격 푸시
git push -u origin "$BRANCH_NAME"

echo "✅ origin으로 푸시"
```

### Phase 1-5: PR 본문 생성

```bash
# 1. 변경 통계 수집
STATS=$(git diff --stat main..HEAD)
INSERTIONS=$(git diff --numstat main..HEAD | awk '{sum+=$1} END {print sum}')
DELETIONS=$(git diff --numstat main..HEAD | awk '{sum+=$2} END {print sum}')
FILE_COUNT=$(git diff --name-only main..HEAD | wc -l)

CHANGE_STATS="$FILE_COUNT files changed, $INSERTIONS insertions(+), $DELETIONS deletions(-)"

# 2. 파일별 상태 분석
ADDED_FILES=$(git diff --name-status main..HEAD | grep "^A" | cut -f2 | sed 's/^/- /')
DELETED_FILES=$(git diff --name-status main..HEAD | grep "^D" | cut -f2 | sed 's/^/- /')
MODIFIED_FILES=$(git diff --name-status main..HEAD | grep "^M" | cut -f2)

# 3. 수정된 파일의 변경 내용 분석 (AI)
# 각 파일의 diff를 분석하여 주요 변경사항 요약
MODIFIED_FILES_DESC=""
for file in $MODIFIED_FILES; do
  # AI가 git diff main..HEAD -- $file을 분석하여 요약
  SUMMARY=$(analyze_file_changes "$file")
  MODIFIED_FILES_DESC="$MODIFIED_FILES_DESC- $file - $SUMMARY\n"
done

# 4. 이전 PR 링크 생성
if [ $i -gt 0 ]; then
  PREVIOUS_PR_NUMBERS=""
  for j in $(seq 0 $((i-1))); do
    PR_NUM="${PR_NUMBERS[$j]}"
    PREVIOUS_PR_NUMBERS="$PREVIOUS_PR_NUMBERS#$PR_NUM, "
  done
  PREVIOUS_PR_NUMBERS=$(echo "$PREVIOUS_PR_NUMBERS" | sed 's/, $//')
  PREVIOUS_PRS="- 이전 PR: $PREVIOUS_PR_NUMBERS"
else
  PREVIOUS_PRS=""
fi

# 5. PR 템플릿 치환
PR_BODY=$(cat commands/templates/pr.yaml | sed \
  -e "s/{CHANGE_STATS}/$CHANGE_STATS/" \
  -e "s/{ADDED_FILES}/${ADDED_FILES:-없음}/" \
  -e "s/{DELETED_FILES}/${DELETED_FILES:-없음}/" \
  -e "s/{MODIFIED_FILES}/$MODIFIED_FILES_DESC/" \
  -e "s/{TASK_ID}/$TASK_ID/" \
  -e "s/{TASK_ID_PREFIX}/KT-/" \
  -e "s/{NOTION_TASK_URL}//" \
  -e "s/{PREVIOUS_PRS}/$PREVIOUS_PRS/" \
  -e "s/{PARENT_TASK}//")

echo "✅ PR 본문 생성"
```

### Phase 1-6: PR 생성

```bash
# 1. gh pr create 실행
PR_URL=$(gh pr create \
  --base main \
  --head "$BRANCH_NAME" \
  --title "[$TASK_ID] $(echo "$GROUP" | jq -r '.name')" \
  --body "$PR_BODY")

# 2. PR 번호 추출
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
PR_NUMBERS[$i]=$PR_NUMBER

echo "✅ PR 생성: $PR_URL"
```

### Phase 2: 완료 메시지

```bash
echo ""
echo "🎉 완료! ${#TASK_IDS[@]}개 PR 생성됨"
echo ""

for i in "${!TASK_IDS[@]}"; do
  TASK_ID="${TASK_IDS[$i]}"
  PR_NUM="${PR_NUMBERS[$i]}"
  echo "- PR #$PR_NUM: $TASK_ID"
done

# main으로 복귀
git checkout main
```

## 에러 처리

### 빌드 실패 시

```bash
echo "❌ 빌드 실패"
echo ""
echo "롤백 중..."
git checkout main
git branch -D "$BRANCH_NAME"
echo "✅ 브랜치 삭제 완료"
echo ""
echo "💡 다음 단계:"
echo "1. 코드 수정"
echo "2. ship:plan 재실행"
echo "3. ship:apply 재실행"
exit 1
```

### PR 생성 실패 시

```bash
echo "❌ PR 생성 실패"
echo ""
echo "브랜치는 푸시되었습니다: $BRANCH_NAME"
echo "수동으로 PR을 생성하거나, 브랜치를 삭제하세요."
echo ""
echo "수동 PR 생성:"
echo "  gh pr create --base main --head $BRANCH_NAME"
echo ""
echo "브랜치 삭제:"
echo "  git push origin --delete $BRANCH_NAME"
```

## 참고

- 계획 파일: `.claude/ship/plan.json`
- PR 템플릿: `commands/templates/pr.yaml`
- 컨벤션: `commands/conventions/coding.yaml`
- 환경 변수: `commands/env`

## Instructions

위의 워크플로우를 따라 태스크별로 브랜치, 커밋, 푸시, PR을 자동 생성하세요.

**중요:**

1. 각 태스크는 main 기준 독립적인 브랜치
2. 정확히 1개의 커밋만 생성
3. 빌드 검증 필수
4. 실패 시 즉시 중단 및 롤백
5. 이전 PR 링크 자동 포함
