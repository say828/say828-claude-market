# ship:plan - 대화형 분할 계획 수립

모든 변경사항을 분석하고 PR 크기 기준(300줄)으로 분할 계획을 수립합니다.

## 환경 변수

```bash
source "$(dirname "$0")/../env"
```

## 컨벤션 규칙

- **PR 크기 제한**: 300줄 이하 (테스트 코드 제외)
- **브랜치명**: `{username}/KT-{TASK_ID}`
- **커밋 메시지**: `[KT-{TASK_ID}] {ClassName}에 {action}을/를 {verb}`
- **각 PR**: main 기준 정확히 1개의 커밋

## 워크플로우

### Phase 1: 변경사항 수집

1. **Git 상태 확인**

   ```bash
   git status --porcelain
   ```

2. **변경사항 분류**
   - Staged 파일 (git add된 파일)
   - Unstaged 파일 (수정되었지만 add 안 된 파일)
   - Untracked 파일 (새로 생성된 파일)

3. **각 파일의 변경량 분석**

   ```bash
   git diff --numstat HEAD
   ```

   - 추가된 라인 수
   - 삭제된 라인 수
   - 순 변경량 계산

### Phase 2: 파일 그룹화

1. **파일 내용 분석**
   - 각 파일의 주요 변경 사항 파악
   - 클래스명, 메서드명 추출
   - 변경 목적 파악

2. **논리적 그룹 생성**
   - 기능별 그룹화 (예: LineLogin, ExchangeToken, GetVisitors)
   - 의존성 순서 고려 (테스트/인프라 → 구현체)
   - 각 그룹의 총 라인 수 계산

3. **그룹 분할 (300줄 기준)**
   - 각 그룹이 300줄 이하가 되도록 조정
   - 큰 그룹은 여러 개로 분할
   - 작은 그룹은 병합 제안

### Phase 3: 분할 계획 생성

1. **계획 데이터 구조**

   ```json
   {
     "version": "1.0",
     "created_at": "2026-02-03T17:00:00Z",
     "base_branch": "main",
     "username": "say",
     "groups": [
       {
         "group_id": 1,
         "name": "LineLogin 구현",
         "description": "LINE 로그인 기능 구현",
         "files": [
           {
             "path": "api/src/main/java/.../LineLoginCommandExecutor.kt",
             "status": "added",
             "insertions": 120,
             "deletions": 0,
             "changes": [
               "LineLoginCommandExecutor 클래스 추가",
               "LINE OAuth 토큰 검증 로직 구현"
             ]
           },
           {
             "path": "api/src/main/java/.../LineLoginResult.kt",
             "status": "added",
             "insertions": 25,
             "deletions": 0,
             "changes": [
               "LineLoginResult 데이터 클래스 추가"
             ]
           }
         ],
         "stats": {
           "total_files": 2,
           "insertions": 145,
           "deletions": 0,
           "net_lines": 145
         },
         "commit_message": "[{TASK_ID}] LineLoginCommandExecutor를 추가한다",
         "suggested_task_name": "LINE 로그인 구현"
       },
       {
         "group_id": 2,
         "name": "ExchangeToken 구현",
         "files": [...],
         "stats": {...}
       }
     ],
     "total_stats": {
       "total_groups": 3,
       "total_files": 8,
       "insertions": 625,
       "deletions": 23
     }
   }
   ```

2. **계획 출력 형식**

   ```text
   📊 변경사항 분석 완료

   총 8개 파일, 625 insertions(+), 23 deletions(-)

   분할 제안 (300줄 기준):

   ┌─────────────────────────────────────────────────┐
   │ 그룹 1: LineLogin 구현                          │
   │ 145줄 (2 files)                                 │
   │                                                 │
   │ 파일:                                           │
   │  - LineLoginCommandExecutor.kt (추가)           │
   │  - LineLoginResult.kt (추가)                    │
   │                                                 │
   │ 커밋: [KT-{TASK_ID}] LineLoginCommandExecutor  │
   │       를 추가한다                               │
   │                                                 │
   │ 제안 태스크명: LINE 로그인 구현                 │
   └─────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────┐
   │ 그룹 2: ExchangeToken 구현                      │
   │ 280줄 (3 files)                                 │
   │ ...                                             │
   └─────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────┐
   │ 그룹 3: GetVisitors 구현                        │
   │ 200줄 (3 files)                                 │
   │ ...                                             │
   └─────────────────────────────────────────────────┘
   ```

### Phase 4: 대화형 조정

1. **사용자 확인**
   - 계획이 적절한지 확인
   - 수정 사항 요청 받기

2. **계획 수정 옵션**
   - 그룹 병합: "그룹 1과 2를 합쳐주세요"
   - 그룹 분할: "그룹 2를 두 개로 나눠주세요"
   - 파일 이동: "파일 X를 그룹 1로 옮겨주세요"
   - 순서 변경: "그룹 3을 먼저 처리하고 싶어요"

3. **재분석 및 재출력**
   - 수정 사항 반영
   - 업데이트된 계획 출력

### Phase 5: 계획 저장

1. **저장 위치**

   ```bash
   mkdir -p .claude/ship
   echo "$PLAN_JSON" > .claude/ship/plan.json
   ```

2. **완료 메시지**

   ```text
   ✅ 계획 저장 완료: .claude/ship/plan.json

   다음 단계:
   1. 노션에서 태스크 생성:
      - LINE 로그인 구현 (KT-12633)
      - ExchangeToken 구현 (KT-12634)
      - GetVisitors 구현 (KT-12635)

   2. 태스크 ID 리스트로 적용:
      ship:apply KT-12633 KT-12634 KT-12635
   ```

## 분석 기준

### 파일 그룹화 휴리스틱

1. **클래스명 기반**
   - 같은 클래스명을 포함하는 파일들을 그룹화
   - 예: `LineLoginCommandExecutor`, `LineLoginResult` → "LineLogin" 그룹

2. **패키지 구조 기반**
   - 같은 패키지의 연관된 파일들을 그룹화
   - 예: `executors/` 패키지의 관련 파일들

3. **의존성 순서**
   - 인터페이스/추상 클래스 → 구현체
   - 도메인 객체 → 서비스 → API
   - 테스트 인프라 → 구현체 + 테스트

4. **변경 목적**
   - 같은 기능을 위한 변경들을 그룹화
   - 예: "LINE 로그인", "토큰 교환", "내원객 조회"

### 크기 조정 전략

1. **너무 큰 그룹 (300줄 초과)**
   - 파일별로 분할
   - 인터페이스와 구현체 분리
   - 도메인/서비스/API 레이어 분리

2. **너무 작은 그룹 (50줄 미만)**
   - 인접한 그룹과 병합 제안
   - 단, 논리적으로 분리되어야 하는 경우는 유지

## 참고

- 컨벤션: `commands/conventions/coding.yaml`
- 환경 변수: `commands/env`

## Instructions

위의 워크플로우를 따라 변경사항을 분석하고 분할 계획을 수립하세요.

**중요:**

1. 사용자와 대화하며 계획을 조정
2. 각 그룹은 독립적으로 빌드 가능해야 함
3. 의존성 순서 보장
4. 300줄 기준 준수 (테스트 제외)
5. 명확한 커밋 메시지 제안
