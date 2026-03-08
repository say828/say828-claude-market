# ADL Architecture

## Runtime-neutral contract

Input:
- final answer text
- runtime metadata
- prior loop state

Output:
- continue or stop
- synthesized follow-up prompt when continuing
- focus hint
- deduplication signature

## Claude adapter

- Trigger: `Stop` hook
- Input source: hook stdin JSON + transcript file
- Action:
  - parse last assistant message from transcript
  - run shared decision engine
  - if stop: exit 0
  - if continue: emit `{"decision":"block","reason":"..."}`

## Codex adapter

- Trigger: official `notify`
- Input source: legacy JSON payload appended to argv
- Action:
  - parse `last-assistant-message`
  - run shared decision engine
  - default to the explicit `NEXT_WORK: YES|NO` contract for continue/stop
  - allow legacy free-form follow-up inference only when fallback env is explicitly enabled
  - if stop: return 0
  - if continue: inject prompt into tmux pane or spawn `codex exec resume`

## Loop control

State is stored under `~/.autonomous-decision-loop/state/`.

Per runtime/session, ADL records:
- last follow-up signature
- chain depth
- repeated signature count
- last action timestamp
- runtime metadata such as the last Codex turn id and last focus hint when available

The loop stops when:
- the final answer declares `NEXT_WORK: NO`
- the final answer does not declare `NEXT_WORK: YES` and legacy fallback is disabled
- the same signature repeats too many times
- max chain depth is reached
- the runtime surface is unavailable
