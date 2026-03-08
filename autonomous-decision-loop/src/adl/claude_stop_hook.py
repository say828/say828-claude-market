#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adl.engine import classify_response, extract_claude_transcript_text
from adl.state import advance, reset_state, save_state

MAX_DEPTH = int(os.environ.get("ADL_CLAUDE_MAX_DEPTH", "50"))
MAX_REPEAT = int(os.environ.get("ADL_CLAUDE_MAX_REPEAT", "2"))


def main() -> int:
    hook_input = json.load(sys.stdin)
    transcript_path = hook_input.get("transcript_path")
    session_id = str(hook_input.get("session_id") or hook_input.get("subagent_id") or "default")
    text = extract_claude_transcript_text(transcript_path or "")
    decision = classify_response(text)

    if not decision.continue_loop:
        reset_state("claude", session_id, last_focus="")
        return 0

    allowed, state = advance("claude", session_id, decision.signature, max_repeat=MAX_REPEAT, max_depth=MAX_DEPTH)
    state.update({"last_focus": decision.focus})
    save_state("claude", session_id, state)
    if not allowed:
        return 0

    payload = {
        "decision": "block",
        "reason": decision.prompt,
        "systemMessage": f"ADL continue: {decision.focus or 'highest-value remaining work'}",
    }
    json.dump(payload, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
