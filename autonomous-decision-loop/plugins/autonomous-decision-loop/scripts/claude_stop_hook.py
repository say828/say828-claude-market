#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "src"))

from adl.claude import extract_last_assistant_message
from adl.core import analyze_message
from adl.state import advance


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    session_id = str(payload.get("session_id") or payload.get("sessionId") or payload.get("cwd") or "default")
    transcript_path = payload.get("transcript_path") or payload.get("transcriptPath") or ""
    message = extract_last_assistant_message(transcript_path)
    if not message:
        return 0
    decision = analyze_message(message, runtime="claude")
    if not decision.should_continue:
        return 0
    allow, _state = advance(
        runtime="claude",
        session_id=session_id,
        signature=decision.signature,
        max_repeat=int(payload.get("adl_max_repeat", 2)) if isinstance(payload, dict) else 2,
        max_depth=int(payload.get("adl_max_depth", 30)) if isinstance(payload, dict) else 30,
    )
    if not allow:
        return 0
    sys.stdout.write(json.dumps({"decision": "block", "reason": decision.prompt}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
