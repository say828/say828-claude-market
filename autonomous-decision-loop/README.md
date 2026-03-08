# Autonomous Decision Loop

This directory is vendored into `say828-agent-market`.
Use the market repository as the install surface.

Autonomous Decision Loop (ADL) is a response-conditioned orchestration layer for terminal coding agents.

It reads the agent's final answer, decides whether meaningful work remains, synthesizes the next decision prompt, and continues only when further action is warranted.

This repository ships:

- a Claude Code marketplace-compatible plugin using `Stop` hooks
- a Codex adapter using `notify` plus tmux-aware continuation
- a one-command installer for both runtimes

## Core Concept

ADL is not a bounded retry loop.

It does four things:

1. read the latest final answer
2. infer whether meaningful follow-up work remains
3. synthesize the next decision prompt from that answer
4. continue or stop autonomously

The same decision engine is shared across Claude Code and Codex.
The synthesized continuation prompt also tells the runtime to parallelize independent side work through sub-agents when that meaningfully shortens time-to-completion.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/say828/autonomous-decision-loop/main/scripts/install.sh | bash
```

What the installer does:

- clones or updates this repo under `~/.local/share/autonomous-decision-loop/repo`
- registers the Claude marketplace entry and installs the plugin locally
- configures Codex `notify` to call the ADL Codex adapter
- preserves the previous Codex `notify` command and chains it after ADL when possible

## Claude Code

This repo is a single-plugin marketplace.

Manual marketplace flow:

```text
/plugin marketplace add say828/autonomous-decision-loop
/plugin install autonomous-decision-loop@say828-autonomous-decision-loop
```

The plugin uses a `Stop` hook. When Claude is about to stop, ADL inspects the transcript and blocks the stop only if the final answer implies that meaningful next work remains.

## Codex

Codex does not expose an equivalent built-in hook surface. ADL uses the official `notify` callback and then either:

- injects the synthesized decision prompt back into the active tmux pane, or
- falls back to `codex exec resume <thread>` when tmux injection is unavailable

## Repository Layout

```text
.claude-plugin/marketplace.json
plugins/autonomous-decision-loop/
  .claude-plugin/plugin.json
  hooks/hooks.json
  scripts/claude_stop_hook.py
runtime/codex_notify.py
src/adl/
scripts/install.sh
scripts/install.py
tests/
```

## Validation

```bash
python3 -m unittest discover -s tests -t . -p 'test_*.py'
python3 scripts/install.py --repo-dir "$PWD" --skip-codex --skip-claude
python3 scripts/doctor.py --repo-dir "$PWD"
```

## Compatibility Notes

- Claude Code path is first-class because it has a native stop-hook surface.
- Codex path is implemented on top of `notify`, not a native hook.
- tmux is strongly recommended for Codex because it allows inline continuation in the active interactive session.
- Codex wrapper installers must persist the real Codex binary, not the wrapper symlink itself; wrapper resolution must skip self-referential paths to avoid recursive tmux relaunch loops.
- Both runtimes share signature/depth state under `~/.autonomous-decision-loop/state/` to prevent repeated self-trigger loops.
