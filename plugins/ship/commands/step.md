---
description: Apply first commit from ship:plan and verify build
argument-hint: ""
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
model: claude-sonnet-4-5-20250929
---

# Ship Step - 계획된 커밋 순차 적용

## Critical References

**Convention Rules:** @conventions/coding.yaml
**Environment Variables:** @env

---

## 스크립트 사용

**단일 커밋 적용 및 검증:**

```bash
.claude/scripts/step.sh
```

스크립트가 다음을 자동으로 수행:

1. Plan 파일 존재 확인
2. 첫 번째 커밋 적용
3. 빌드/테스트 실행
4. 실패 시 soft reset 및 안내

---

## Pre-validation

**실행 전 필수 검증:**

1. **ship:plan 실행 여부 확인:**
   - `.claude/scripts/.plan.json` 파일 존재 확인
   - 파일이 없으면: "❌ No plan found. Run 'ship:plan' first." 출력 후 종료

2. **변경사항 확인:**
   - `git status`로 변경사항 확인
   - 변경사항이 없으면: "❌ No changes found." 출력 후 종료

3. **남은 커밋 확인:**
   - Plan에 남은 커밋이 없으면: "✅ All commits applied!" 출력 후 종료

---

## Execution

### Phase 1: Plan 로드

1. `.plan.json` 파일 로드
2. 첫 번째 커밋 정보 추출:
   - message: 커밋 메시지
   - files: 포함할 파일 목록

### Phase 2: 첫 번째 커밋 적용

1. **모든 변경사항 unstage:**

   ```bash
   git reset HEAD
   ```

2. **첫 번째 커밋 파일만 staging:**

   ```bash
   git add <첫 번째 커밋 파일들>
   ```

3. **커밋 생성:**

   ```bash
   git commit -m "[NO-T] {동사형 작업 문장}"
   ```

   **중요:** Co-Authored-By 라인을 절대 추가하지 마세요. 커밋 메시지는 위 형식만 사용합니다.

### Phase 3: 빌드/테스트 검증

1. **빌드 및 테스트 실행:**

   ```bash
   ./gradlew build
   ```

2. **결과에 따른 처리:**
   - **성공:** Plan에서 첫 번째 커밋 제거 후 진행 안내
   - **실패:** soft reset 후 재계획 안내

### Phase 4: 결과 출력

**성공 시:**

```text
✅ STEP COMPLETED!

📦 Created commit:
   {sha} - [NO-T] {커밋 메시지}

📋 Remaining: {N}개 커밋 남음

🎯 Next: 'ship:step'으로 다음 커밋 적용
```

**실패 시:**

```text
❌ BUILD FAILED!

🔄 Soft reset completed.
   커밋이 취소되고 변경사항은 unstaged 상태입니다.

📋 원인 분석:
   {실패 원인}

🎯 Next steps:
   1. 코드 수정
   2. 'ship:plan'으로 재계획
   3. 'ship:step'으로 다시 시도
```

---

## Workflow Summary

```text
ship:plan → ship:step → [성공] → ship:step → ... → 완료
                ↓
            [실패]
                ↓
         soft reset
                ↓
           코드 수정
                ↓
          ship:plan
                ↓
          ship:step
```

---

## Error Handling

모든 오류 발생 시:

1. ❌ 명확한 오류 메시지 출력
2. 원인 설명
3. soft reset (커밋 실패 시)
4. 해결 방법 안내

## Logging

- 🔍 Phase 시작
- ✅ 성공
- ❌ 오류
- ⚠️ 경고
- 📋 참조 정보
- 🎯 다음 단계
- 📦 결과 요약
- 🔄 롤백/리셋
