# Ship Help - Command Reference

## Available Commands

```text
📦 Ship - PR 자동 분할 & 생성 워크플로우

📋 Main Commands:

  ✅ ship:plan                    변경사항 분석 및 분할 계획 수립 (대화형)
  ✅ ship:apply <task-ids>        태스크별 브랜치/커밋/푸시/PR 자동 생성

  예: ship:apply KT-12633 KT-12634 KT-12635

📋 Legacy Commands:

  ship:step                       계획된 첫 번째 커밋 적용
  ship:reset                      브랜치 soft reset

📋 Typical Workflow:

  1. 모든 작업 완료
     $ git status  # 8 files changed...

  2. 분할 계획 수립 (대화형)
     $ ship:plan
     → 그룹 3개로 분할 제안
     → 대화하며 계획 조정
     → .claude/ship/plan.json 저장

  3. 노션에서 태스크 생성
     - LINE 로그인 구현 (KT-12633)
     - ExchangeToken 구현 (KT-12634)
     - GetVisitors 구현 (KT-12635)

  4. 일괄 처리
     $ ship:apply KT-12633 KT-12634 KT-12635
     → 각 태스크마다:
       ✅ 브랜치 생성
       ✅ 커밋
       ✅ 빌드 검증
       ✅ 푸시
       ✅ PR 생성

  5. 완료!
     → 3개 PR 생성 완료
     → 각 PR은 main 기준 1 commit

📋 Environment Variables:
  Source: commands/env

  - TASK_ID_PREFIX          Task ID 접두사 (default: KT-)
  - PR_MAX_LINES            PR당 최대 라인 수 (default: 300)
  - GITHUB_BASE_BRANCH      Base 브랜치 (default: main)
  - BUILD_CMD               빌드 명령어
  - TEST_CMD                테스트 명령어

📋 Convention Rules:
  - Branch: {username}/KT-{TASK_ID}
  - Commit: [KT-{TASK_ID}] {ClassName}에 {action}을/를 {verb}
  - PR Size: 300줄 이하 (테스트 제외)

🎯 For details: README.md
```

## Instructions

위 내용을 사용자에게 출력하세요.
