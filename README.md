# say828 Agent Market

Codex, Claude, 그리고 앞으로 추가될 agent runtime 플러그인을 한곳에서 관리하는 중앙 마켓 레포입니다.

## 마켓플레이스 추가

```bash
/plugin marketplace add say828/say828-agent-market
```

추가 후 Claude Code 플러그인 설치:

```bash
# claude-orchestrator 설치
/plugin install claude-orchestrator@say828-agent-market

# autonomous-decision-loop 설치
/plugin install autonomous-decision-loop@say828-agent-market

# ship 설치
/plugin install ship@say828-agent-market
```

## 방향

- Claude Code 플러그인 마켓
- Codex 런타임용 플러그인과 어댑터 허브
- 공통 agent workflow, UI, 패키지, 설치 스크립트를 함께 관리하는 모노레포

현재 이 레포는 Claude/Codex 공용 마켓이며, `autonomous-decision-loop` 같은 런타임 플러그인도 같은 레포에서 직접 설치/운영합니다.

## Codex 설치

Codex용 자산은 현재 skill 형태로 제공합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/say828/say828-agent-market/main/scripts/install.sh | bash
```

기본 설치 결과:

- Claude binary 설치: `claude-orchestrator`
- Codex skills 설치: `planning-with-files`
- Codex ADL notify/wrapper 설치: `~/.local/bin/codex`, `~/.codex/config.toml`
- Claude ADL plugin 로컬 연결: `autonomous-decision-loop@say828-agent-market`
- 기본값은 tmux-backed Codex 실행이며, ADL runtime은 market 레퍼 내부 자산을 사용함

선택 설치:

```bash
# Codex skills만 설치
curl -fsSL https://raw.githubusercontent.com/say828/say828-agent-market/main/scripts/install.sh | bash -s -- --codex-only

# Claude 자산만 설치
curl -fsSL https://raw.githubusercontent.com/say828/say828-agent-market/main/scripts/install.sh | bash -s -- --claude-only
```

Codex skill 설치 위치:

- `~/.codex/skills/planning-with-files`
- `~/.local/share/say828-agent-market/repo`

Codex ADL 런타임 위치:

- `~/.local/share/say828-agent-market/repo/autonomous-decision-loop`

## 현재 플러그인

| 플러그인 | 설명 |
|----------|------|
| **claude-orchestrator** | Browser-based multi-session management UI for Claude Code |
| **ship** | PR 분할 및 자동 생성 워크플로우 도구 |
| **planning-with-files** | Codex에서 작업 계획을 `docs/plans/` 파일로 유지하는 skill |
| **autonomous-decision-loop** | Claude Stop hook + Codex notify/tmux 기반의 응답 조건부 자동 후속 실행 플러그인 |

---

## claude-orchestrator

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
curl -fsSL https://raw.githubusercontent.com/say828/say828-agent-market/main/scripts/install.sh | bash

# 2. 플러그인 설치
/plugin marketplace add say828/say828-agent-market
/plugin install claude-orchestrator@say828-agent-market
/plugin install autonomous-decision-loop@say828-agent-market
```

> **Note:** `~/.local/bin`이 PATH에 있어야 합니다.
>
> 바이너리 미설치 시 훅 호출 시 설치 안내 메시지가 표시됩니다.

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
/plugin install ship@say828-agent-market
```

---

## planning-with-files

Codex가 다단계 작업을 `docs/plans/*.md` 파일에 기록하며 진행하도록 하는 skill입니다.

주요 파일:

- `codex/skills/planning-with-files/SKILL.md`
- `codex/skills/planning-with-files/scripts/new_plan.sh`

기본 사용:

```bash
~/.codex/skills/planning-with-files/scripts/new_plan.sh "feature name" /path/to/repo
```

---

## autonomous-decision-loop

Codex는 `notify + tmux` 경로로, Claude는 `Stop` hook 경로로 같은 ADL 엔진을 사용합니다.

주요 파일:

- `autonomous-decision-loop/src/adl/*`
- `autonomous-decision-loop/runtime/codex_notify.py`
- `plugins/autonomous-decision-loop/`
- `scripts/install_adl.py`

기본 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/say828/say828-agent-market/main/scripts/install.sh | bash
```

검증:

```bash
python3 scripts/doctor_adl.py --repo-dir /path/to/say828-agent-market
python3 -m unittest discover -s autonomous-decision-loop/tests -t autonomous-decision-loop -p 'test_*.py'
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

# Orchestrator 빌드
bun run build:orchestrator

# 전체 빌드
bun run build

# 릴리즈 바이너리 생성
bun run build:release
```

## 프로젝트 구조

```
say828-agent-market/
├── apps/orchestrator/  # claude-orchestrator CLI 바이너리
├── codex/
│   └── skills/         # Codex skill packages
├── packages/
│   ├── server/         # 공통 서버 라이브러리
│   └── orchestrator-ui/ # React SPA (Vite)
├── plugins/
│   └── ship/           # Claude 플러그인
└── .claude-plugin/     # Claude 마켓플레이스 설정
```

## 라이선스

Non-commercial + Copyleft License - see [LICENSE](LICENSE) for details.

상업적 사용 문의: gusdn0828@gmail.com
