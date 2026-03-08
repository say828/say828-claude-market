# codex-skill-market-bootstrap

- Date: 2026-03-07
- Owner: Codex
- Status: completed

## 2026-03-08 Update

- `codex-hud`는 더 이상 이 레포의 Codex 배포 자산에 포함하지 않는다.
- 활성 Codex wrapper는 유지하되 배포 대상 skill은 `planning-with-files` 하나로 축소한다.

## Scope

- In scope:
  - Add Codex-installable `planning-with-files` and `codex-hud` skill packages to `say828-agent-market`.
  - Extend the market install contract so the repository can install Codex skills as well as the Claude binary/plugin flow.
  - Update top-level documentation so the advertised Codex install path matches the actual implementation.
  - Validate local installation of the Codex skills in an isolated HOME.
- Out of scope:
  - Implementing every future Codex plugin in this turn.
  - Reworking Claude runtime architecture beyond install/documentation alignment.

## Assumptions

- Codex skills are installable by copying a skill directory containing `SKILL.md` plus its referenced `scripts/`, `assets/`, `references/`, and optional `agents/` into `~/.codex/skills/<skill-name>`.
- The local canonical skill sources under `/home/sh/.codex/skills` are valid seed content for the packaged versions in this repository.

## Acceptance Criteria

- [x] Repository contains packaged Codex skills for `planning-with-files` and `codex-hud`.
- [x] `scripts/install.sh` can install those Codex skills into `~/.codex/skills`.
- [x] README documents a real Codex install flow that matches the script behavior.
- [x] Validation evidence confirms both skills install and their key scripts are runnable from an isolated HOME.

## Execution Checklist

- [x] Inspect current Codex skill structure and installation surface.
- [x] Package `planning-with-files` under the repository.
- [x] Package `codex-hud` under the repository.
- [x] Extend the installer for Codex skill installation.
- [x] Update README and related docs to describe the Codex installation contract.
- [x] Validate install and runtime behavior in an isolated HOME.

## Work Log

- 2026-03-07 11:39 - Confirmed the current market repo exposes only Claude marketplace metadata and no Codex-installable assets.
- 2026-03-07 11:41 - Inspected local canonical Codex skills and confirmed the install surface is directory-based under `~/.codex/skills/<skill-name>`.
- 2026-03-07 12:00 - Vendored `planning-with-files` and `codex-hud` under `codex/skills/` so the market repo now carries actual Codex-installable assets.
- 2026-03-07 12:05 - Rebuilt `scripts/install.sh` to support local/remote repository sourcing, `--claude-only`, `--codex-only`, and default Codex skill installation into `~/.codex/skills`.
- 2026-03-07 12:08 - Updated README to document Codex install flow, skill inventory, usage entrypoints, and the expanded project structure.
- 2026-03-07 12:11 - Added legacy Claude release asset fallback to the installer and updated the release workflow to emit future assets with the new `claude-orchestrator-*` naming and current repository paths.
- 2026-03-07 12:14 - Validated isolated Codex install, plan-file generation, HUD snapshot execution, installer syntax, and stale-name removal checks.
- 2026-03-07 12:20 - Confirmed the current HUD works as a log/process snapshot but does not yet surface Codex `notify` wiring or ADL notify execution logs directly, which causes the expected hook/notify visibility gap.
- 2026-03-07 12:28 - Identified the remaining product gap: the user expects Codex HUD to appear automatically alongside the active TUI, so the next implementation step is tmux-based auto-attach instead of manual snapshot invocation.
- 2026-03-07 12:34 - Added market-packaged Codex wrapper scripts that create a tmux session, split a dedicated HUD pane, and attach the real Codex TUI in the main pane.
- 2026-03-07 12:39 - Extended the installer to persist the market repo under `~/.local/share/say828-agent-market/repo`, install `~/.local/bin/codex` as the wrapper entrypoint, and preserve the real Codex binary path in `codex.env`.
- 2026-03-07 12:41 - Validated tmux auto-attach by launching the packaged inline wrapper against a fake Codex binary and confirming a two-pane session with live HUD content in pane `0.1`.

## Validation

- [x] Build or test commands executed and logged.
- [x] DEV deployment or runtime checks completed if required.

### Evidence

- `bash scripts/install.sh --help`
- `bash -n scripts/install.sh`
- `HOME=<tmp> bash scripts/install.sh --repo-dir "$PWD" --codex-only`
- `HOME=<tmp> ~/.codex/skills/planning-with-files/scripts/new_plan.sh "market codex test" <tmp-repo>`
- `HOME=<tmp> ~/.codex/skills/codex-hud/scripts/hud_snapshot.sh --repo "$PWD" --log <tmp-home>/.codex/log/missing.log --limit 2`
- `rg -n "yourturn-|apps/hook|packages/ui|claude-maestro-linux|claude-maestro-macos|claude-maestro-windows" -S .github/workflows/release.yml scripts/install.sh README.md`
- `timeout 3 env TMUX='' CODEX_REAL_BIN=<fake-codex> CODEX_INLINE_WORKDIR=<tmp-repo> ~/.local/share/say828-agent-market/repo/codex/bin/codex-inline-tmux.sh`
- `tmux list-panes -t <codex-hud-session>`
- `tmux capture-pane -p -t <codex-hud-session>:0.1`

## Risks / Follow-ups

- The Codex side is currently packaged as skills, not as a richer runtime/plugin registry with versioned manifest semantics; if broader Codex packaging becomes necessary, an additional contract layer should be added.
- Existing published GitHub release assets still use the legacy `claude-maestro-*` names, so the installer keeps a compatibility fallback until a new tag publishes renamed assets.
