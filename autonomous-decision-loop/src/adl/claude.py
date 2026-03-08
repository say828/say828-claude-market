from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _extract_text(obj: Any) -> list[str]:
    texts: list[str] = []
    if isinstance(obj, str):
        if obj.strip():
            texts.append(obj.strip())
        return texts
    if isinstance(obj, list):
        for item in obj:
            texts.extend(_extract_text(item))
        return texts
    if isinstance(obj, dict):
        for key in ("text", "content", "message", "output"):
            if key in obj:
                texts.extend(_extract_text(obj[key]))
        return texts
    return texts


def extract_last_assistant_message(transcript_path: str) -> str:
    path = Path(transcript_path)
    if not path.exists():
        return ""
    last = ""
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except Exception:
            continue
        role = item.get("role") or item.get("message", {}).get("role") or item.get("type")
        candidate = " ".join(_extract_text(item))
        if role and str(role).lower() in {"assistant", "assistant_message"} and candidate:
            last = candidate
    return last
