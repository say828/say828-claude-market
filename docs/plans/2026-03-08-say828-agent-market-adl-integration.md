# say828-agent-market-adl-integration

- Date: 2026-03-08
- Owner: Codex
- Status: completed

## Scope

- In scope:
  - Integrate the `autonomous-decision-loop` runtime, plugin assets, tests, and install flow into `say828-agent-market`.
  - Make `say828-agent-market` the single install surface for Codex ADL and Claude ADL marketplace assets.
  - Update Codex/Claude marketplace metadata and documentation to advertise ADL from the market repo.
  - Remove the standalone `autonomous-decision-loop` folder from `/home/sh/Documents/Github/aspace` after validation.
- Out of scope:
  - Reworking unrelated orchestrator or ship functionality.
  - Publishing a new GitHub release tag in this turn.

## Assumptions

- The market repo can vendor the ADL project as a subtree-style directory as long as install and marketplace paths resolve from the market repo.
- Codex installation should keep the existing `planning-with-files` skill while switching ADL runtime ownership to `say828-agent-market`.
- Claude plugin installation remains marketplace-driven, but the plugin source must live under the market repo.

## Acceptance Criteria

- [x] `say828-agent-market` contains the ADL runtime, Claude plugin package, and Codex install assets needed to install ADL without referencing the standalone repo.
- [x] The market installer configures Codex `notify` and wrapper paths to files under `say828-agent-market`.
- [x] The market marketplace manifest advertises the Claude ADL plugin.
- [x] Validation proves ADL tests pass from the integrated location and a fresh install works from `say828-agent-market`.
- [x] `/home/sh/Documents/Github/aspace/autonomous-decision-loop` is removed after successful integration.

## Execution Checklist

- [x] Inspect both repositories and choose the integration shape.
- [x] Vendor ADL assets into the market repo and wire marketplace/install paths.
- [x] Update docs and installer messaging for the unified Codex/Claude market contract.
- [x] Validate integrated tests and isolated/current-user installation behavior.
- [x] Remove the standalone ADL folder from aspace and close the plan with evidence.

## Work Log

- 2026-03-08 00:00 - Plan created.
- 2026-03-08 10:23 - Compared the active `say828-agent-market` Codex wrapper layout with the standalone `autonomous-decision-loop` repo and confirmed the cleanest integration path is vendoring ADL as a subtree inside the market repo, then making the market installer call that integrated install surface.
- 2026-03-08 10:40 - Vendored the ADL subtree into `say828-agent-market/autonomous-decision-loop`, copied the Claude plugin into `plugins/autonomous-decision-loop`, added root-level ADL install/doctor scripts, and updated the market installer/marketplace manifest/README so ADL now resolves from the market repo.
- 2026-03-08 10:52 - Replaced the market Codex wrapper with the non-HUD tmux-backed ADL launcher, removed `codex-hud` assets from the market repo, and added self-copy protection to the market installer so `--repo-dir` can safely point at the live market checkout.
- 2026-03-08 10:56 - Passed Python syntax checks, Bash syntax checks, integrated ADL unit tests, isolated HOME install validation, and current-user reinstall validation with `notify`, wrapper symlinks, and Claude plugin links all pointing at `say828-agent-market`.
- 2026-03-08 10:58 - Removed `/home/sh/Documents/Github/aspace/autonomous-decision-loop` after successful market integration and installation verification.

## Validation

- [x] Build or test commands executed and logged.
- [x] DEV deployment or runtime checks completed if required.

### Evidence

- `python3 -m py_compile scripts/install_adl.py scripts/doctor_adl.py plugins/autonomous-decision-loop/hooks/stop_hook.py plugins/autonomous-decision-loop/scripts/claude_stop_hook.py autonomous-decision-loop/runtime/codex_notify.py autonomous-decision-loop/src/adl/*.py`
- `bash -n scripts/install.sh autonomous-decision-loop/install.sh autonomous-decision-loop/scripts/install.sh plugins/autonomous-decision-loop/scripts/adl_doctor.sh codex/bin/codex codex/bin/codex-inline-tmux.sh`
- `python3 -m unittest discover -s autonomous-decision-loop/tests -t autonomous-decision-loop -p 'test_*.py'`
- `HOME=<tmp> bash scripts/install.sh --repo-dir /home/sh/.local/share/say828-agent-market/repo --codex-only`
- `HOME=<tmp> python3 scripts/install_adl.py --repo-dir /home/sh/.local/share/say828-agent-market/repo --skip-codex`
- `HOME=<tmp> python3 scripts/doctor_adl.py --repo-dir /home/sh/.local/share/say828-agent-market/repo`
- `bash scripts/install.sh --repo-dir /home/sh/.local/share/say828-agent-market/repo`
- `python3 scripts/doctor_adl.py --repo-dir /home/sh/.local/share/say828-agent-market/repo`

## Risks / Follow-ups

- The market repo now carries a vendored ADL subtree and a root-level plugin/install facade; future changes should keep those paths synchronized or collapse them into a single canonical source.
