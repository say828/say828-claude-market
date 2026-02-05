# Claude Code Marketplace

Claude Code 플러그인 마켓플레이스입니다.

## 마켓플레이스 추가

```bash
/plugin marketplace add say828/say828-claude-market
```

추가 후 플러그인 설치:

```bash
# claude-maestro 설치
/plugin install claude-maestro@say828-claude-market

# ship 설치
/plugin install ship@say828-claude-market
```

## 플러그인 목록

| 플러그인 | 설명 |
|----------|------|
| **claude-maestro** | Browser-based human-in-the-loop UI for Claude Code |
| **ship** | PR 분할 및 자동 생성 워크플로우 도구 |

---

## claude-maestro

Browser-based human-in-the-loop UI for Claude Code. 모든 상호작용을 웹 UI로 처리합니다.

### 기능

| 이벤트 | 트리거 | 설명 |
|--------|--------|------|
| **Plan Review** | `ExitPlanMode` | 마크다운 렌더링 + 구문 강조 |
| **Bash Approval** | `Bash` | 명령어 위험도 평가 (🟢 🟡 🔴) |
| **File Edit Review** | `Edit\|Write` | Side-by-side diff 뷰 |
| **Question UI** | `AskUserQuestion` | 대화형 질문 응답 |
| **Task Complete** | `Stop` | 작업 완료 알림 + 세션 대화 표시 |
| **Subagent Complete** | `SubagentStop` | 서브에이전트 완료 알림 |

### 설치

```bash
# 1. 바이너리 설치 (최초 1회)
curl -fsSL https://raw.githubusercontent.com/say828/say828-claude-market/main/scripts/install.sh | bash

# 2. 플러그인 설치
/plugin marketplace add say828/say828-claude-market
/plugin install claude-maestro@say828-claude-market
```

> **Note:** `~/.local/bin`이 PATH에 있어야 합니다.

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `YOURTURN_PORT` | 고정 포트 번호 | Random (local) / 18765 (remote) |
| `YOURTURN_REMOTE` | 원격 모드 강제 (`1`) | Auto-detect |
| `YOURTURN_BROWSER` | 커스텀 브라우저 명령 | System default |

---

## ship

PR 크기 기준 자동 분할과 순차 PR 생성을 자동화하는 Git 워크플로우 도구입니다.

### 주요 기능

- **대화형 분할 계획**: 변경사항 분석 → PR 크기 기준(300줄)으로 분할
- **자동 PR 생성**: 태스크 ID 입력 → 브랜치/커밋/PR 자동 생성
- **의존성 순서 보장**: 테스트/인프라 먼저, 구현체는 나중에

### 설치

```bash
/plugin install ship@say828-claude-market
```

### 명령어

| 명령어 | 설명 |
|--------|------|
| `ship:plan` | 변경사항 분석 및 분할 계획 수립 |
| `ship:apply <task-ids>` | 태스크별 브랜치/커밋/PR 자동 생성 |
| `ship:step` | 계획된 첫 번째 커밋 적용 |
| `ship:reset` | 현재 브랜치를 base로 soft reset |

### 워크플로우

```
1. 작업 완료 (모든 개발 완료)
       ↓
2. ship:plan (대화형 계획 수립)
       ↓
3. 태스크 생성 (예: KT-12633, KT-12634)
       ↓
4. ship:apply KT-12633 KT-12634
       ↓
5. 완료! 모든 PR 생성됨
```

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `TASK_ID_PREFIX` | `KT-` | Task ID 접두사 |
| `PR_MAX_LINES` | `300` | PR당 최대 라인 수 |
| `GITHUB_BASE_BRANCH` | `main` | Base 브랜치 |
| `BUILD_CMD` | `./gradlew build -x test` | 빌드 명령어 |

---

## 개발

```bash
# 의존성 설치
bun install

# UI 빌드
bun run build:ui

# Hook 빌드
bun run build:hook

# 전체 빌드
bun run build

# 릴리즈 바이너리 생성
bun run build:release
```

## 프로젝트 구조

```
say828-claude-market/
├── apps/hook/          # claude-maestro CLI 바이너리
├── packages/
│   ├── server/         # HTTP 서버 라이브러리
│   └── ui/             # React SPA (Vite)
├── plugins/
│   └── ship/           # ship 플러그인
└── .claude-plugin/     # 마켓플레이스 설정
```

## 라이선스

Non-commercial + Copyleft License - see [LICENSE](LICENSE) for details.

상업적 사용 문의: gusdn0828@gmail.com
