# Autonomous Decision Loop

This plugin installs Stop and SubagentStop hooks that:

1. read the latest assistant response,
2. decide whether meaningful work remains,
3. synthesize the next decision prompt,
4. continue only when warranted.

The installer also patches Codex so the same ADL concept works with `notify + tmux`.
