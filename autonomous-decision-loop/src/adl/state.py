from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

STATE_ROOT = Path.home() / ".autonomous-decision-loop" / "state"


def _sanitize_session_id(session_id: str) -> str:
    raw = (session_id or "default").strip() or "default"
    return "".join(char if char.isalnum() or char in {"-", "_", "."} else "_" for char in raw)


def _state_path(runtime: str, session_id: str) -> Path:
    safe_session = _sanitize_session_id(session_id)
    return STATE_ROOT / runtime / f"{safe_session}.json"


def load_state(runtime: str, session_id: str) -> dict[str, Any]:
    path = _state_path(runtime, session_id)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def save_state(runtime: str, session_id: str, payload: dict[str, Any]) -> None:
    path = _state_path(runtime, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2))


def reset_state(runtime: str, session_id: str, **extra: Any) -> dict[str, Any]:
    state = {
        "signature": "",
        "repeat_count": 0,
        "depth": 0,
        "updated_at": int(time.time()),
    }
    state.update(extra)
    save_state(runtime, session_id, state)
    return state


def advance(runtime: str, session_id: str, signature: str, max_repeat: int = 2, max_depth: int | None = None) -> tuple[bool, dict[str, Any]]:
    state = load_state(runtime, session_id)
    repeat_count = int(state.get("repeat_count", 0))
    depth = int(state.get("depth", 0))
    previous = state.get("signature", "")
    if signature == previous:
        repeat_count += 1
    else:
        repeat_count = 1
        depth += 1
    state.update({
        "signature": signature,
        "repeat_count": repeat_count,
        "depth": depth,
        "updated_at": int(time.time()),
    })
    save_state(runtime, session_id, state)
    if repeat_count > max_repeat:
        return False, state
    if max_depth is not None and depth > max_depth:
        return False, state
    return True, state
