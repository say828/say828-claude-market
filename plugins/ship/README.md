# Ship Plugin

PR 크기 기준 자동 분할과 순차 PR 생성을 자동화하는 Git 워크플로우 도구입니다.

## 개요

Ship 플러그인은 KOS 개발팀의 코딩 컨벤션을 준수하면서 효율적인 Git 워크플로우를
자동화합니다. 모든 개발이 완료된 후 변경사항을 분석하여 적절한 크기로 분할하고,
각 태스크별 브랜치/커밋/PR을 자동 생성합니다.

## 주요 기능

- **대화형 분할 계획**: 변경사항을 분석하고 PR 크기 기준(300줄)으로 분할 계획 수립
- **자동 PR 생성**: 태스크 ID만 입력하면 브랜치 생성부터 PR 생성까지 자동 실행
- **의존성 순서 보장**: 테스트/인프라 먼저, 구현체는 나중에

## 설치

```bash
/plugin marketplace add /path/to/claude-plugin-marketplace
/plugin install ship@kos
```

## 워크플로우

```text
1. 작업 완료 (모든 개발 완료)
    ↓
2. ship:plan (대화형 계획 수립)
   → Claude가 변경사항 분석
   → 분할 계획 제안
   → 대화하며 조정
    ↓
3. 노션에서 태스크 생성
   (예: KT-12633, KT-12634, KT-12635)
    ↓
4. ship:apply KT-12633 KT-12634 KT-12635
   → 각 태스크마다:
     ✅ main에서 브랜치 생성
     ✅ 파일 커밋 (1 commit)
     ✅ 빌드 검증
     ✅ 푸시
     ✅ PR 본문 생성
     ✅ gh pr create
    ↓
5. 완료! 모든 PR 생성됨
```

## 명령어

### ship:plan

변경사항을 분석하고 PR 크기 기준(300줄)으로 분할 계획을 수립합니다.

```bash
ship:plan
```

**동작:**

1. 모든 변경사항 수집 (staged/unstaged/untracked)
2. 파일별 변경 내용 및 라인 수 분석
3. 기능별 그룹화 (예: LineLogin, ExchangeToken, GetVisitors)
4. 300줄 기준으로 그룹 분할/병합
5. 사용자와 대화하며 계획 조정
6. `.claude/ship/plan.json`에 계획 저장

**출력 예시:**

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

✅ 계획 저장 완료: .claude/ship/plan.json

다음 단계:
1. 노션에서 태스크 생성
2. ship:apply KT-12633 KT-12634 KT-12635
```

### ship:apply

태스크 ID 리스트를 받아 각 태스크별로 브랜치/커밋/푸시/PR을 자동 생성합니다.

```bash
ship:apply KT-12633 KT-12634 KT-12635
```

**동작:**

각 태스크마다:

1. main에서 브랜치 생성 (예: `say/KT-12633`)
2. plan의 파일 그룹 커밋 (1 commit)
3. 빌드 검증
4. 원격 푸시
5. PR 본문 생성 (변경 통계 포함)
6. `gh pr create`로 PR 생성

**출력 예시:**

```text
[1/3] KT-12633 처리 중...
✅ say/KT-12633 브랜치 생성
✅ 그룹 1 파일 커밋
✅ 빌드 검증 완료
✅ origin으로 푸시
✅ PR 본문 생성
✅ PR 생성: https://github.com/.../pull/123

[2/3] KT-12634 처리 중...
✅ say/KT-12634 브랜치 생성
✅ 그룹 2 파일 커밋
✅ 빌드 검증 완료
✅ origin으로 푸시
✅ PR 본문 생성
✅ PR 생성: https://github.com/.../pull/124

[3/3] KT-12635 처리 중...
✅ say/KT-12635 브랜치 생성
✅ 그룹 3 파일 커밋
✅ 빌드 검증 완료
✅ origin으로 푸시
✅ PR 본문 생성
✅ PR 생성: https://github.com/.../pull/125

🎉 완료! 3개 PR 생성됨
- PR #123: KT-12633
- PR #124: KT-12634 (이전: #123)
- PR #125: KT-12635 (이전: #123, #124)
```

### ship:step

계획된 첫 번째 커밋을 적용하고 빌드를 검증합니다. (레거시)

```bash
ship:step
```

### ship:reset

현재 브랜치를 base로 soft reset합니다.

```bash
ship:reset
```

## 사용 예시

### 전체 워크플로우

```bash
# 1. 모든 기능 개발 완료
$ git status
# 8 files changed...

# 2. 분할 계획 수립
$ ship:plan
# → 그룹 3개로 분할 제안
# → 계획 조정 대화
# → .claude/ship/plan.json 저장

# 3. 노션에서 태스크 생성
# - LINE 로그인 구현 (KT-12633)
# - ExchangeToken 구현 (KT-12634)
# - GetVisitors 구현 (KT-12635)

# 4. 태스크 ID로 일괄 처리
$ ship:apply KT-12633 KT-12634 KT-12635
# → 3개 PR 자동 생성 완료!
```

## 환경 변수

`commands/env` 파일에서 설정할 수 있습니다:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `TASK_ID_PREFIX` | `KT-` | Task ID 접두사 |
| `PR_MAX_LINES` | `300` | PR당 최대 라인 수 (테스트 제외) |
| `GITHUB_BASE_BRANCH` | `main` | Base 브랜치 |
| `BUILD_CMD` | `./gradlew build -x test` | 빌드 명령어 |
| `TEST_CMD` | `./gradlew test` | 테스트 명령어 |

## 코딩 컨벤션

### 브랜치 네이밍

```text
{username}/KT-{TASK_ID}
예: say/KT-12633
```

### 커밋 메시지

```text
[KT-{TASK_ID}] {ClassName}에 {action}을/를 {verb}
예: [KT-12633] LineLoginCommandExecutor를 추가한다
예: [KT-12633] NhnResultCodeConverter에 queryStatus를 구현한다
```

**규칙:**

- `[KT-XXXXX]` 접두사 필수
- 한국어 문장으로 작성
- 현재형/명령형 사용 (추가한다, 구현한다)
- 클래스명은 실제 코드에서 사용하는 이름 그대로 명시

### PR 가이드라인

- **크기 제한**: 300줄 이하 (테스트 코드 제외)
- **범위**: 하나의 PR에는 하나의 컨텍스트만 포함
- **머지 전략**: rebase and merge만 허용
- **각 PR**: main 기준 정확히 1개의 커밋

### PR 본문 형식

```markdown
## 변경 내용

### 요약
2 files changed, 145 insertions(+), 5 deletions(-)

### 추가된 파일
- LineLoginCommandExecutor.kt
- LineLoginResult.kt

### 삭제된 파일
없음

### 수정된 파일
없음

## 관련 테스크
- KT-12633
- 이전 PR: #123
```

## 커밋 분할 원칙

- 각 커밋은 빌드와 테스트가 통과해야 함
- 하나의 커밋에는 하나의 컨텍스트만 포함
- 테스트 인프라/의존성은 구현체보다 먼저 커밋

## 요구사항

- **Git**: 브랜치 관리 및 커밋 작업
- **Gradle**: 빌드 및 테스트 실행
- **gh CLI**: PR 생성

## 파일 구조

```text
plugins/ship/
├── .claude-plugin/
│   └── plugin.json          # 플러그인 메타데이터
├── commands/
│   ├── env                  # 환경 변수 정의
│   ├── help.md              # 도움말
│   ├── plan.md              # 분할 계획 수립
│   ├── apply.md             # 태스크 일괄 처리
│   ├── step.md              # 단일 커밋 적용
│   ├── reset.md             # 브랜치 리셋
│   ├── conventions/
│   │   └── coding.yaml      # 코딩 컨벤션 규칙
│   └── templates/
│       └── pr.yaml          # PR 템플릿
└── README.md
```

## 라이선스

이 플러그인은 KOS 개발팀 내부용으로 제작되었습니다.

## 작성자

- **Say Kim** - <say.kim@healingpaper.com>
- GitHub: [healingpaper-solution](https://github.com/healingpaper-solution)
