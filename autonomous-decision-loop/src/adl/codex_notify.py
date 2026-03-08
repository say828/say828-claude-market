#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adl.engine import classify_response, extract_codex_message
from adl.state import advance, load_state, reset_state, save_state

STATE_DIR = Path.home() / ".autonomous-decision-loop" / "codex"
LOCK_FILE = STATE_DIR / "notify.lock"
LOG_FILE = STATE_DIR / "notify.log"
MAX_DEPTH = int(os.environ.get("ADL_CODEX_MAX_DEPTH", "50"))
MAX_REPEAT = int(os.environ.get("ADL_CODEX_MAX_REPEAT", "2"))
COOLDOWN_SECONDS = int(os.environ.get("ADL_CODEX_COOLDOWN_SECONDS", "2"))


def log(message: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as fh:
        fh.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")


def try_tmux_continue(prompt: str) -> bool:
    tmux = os.environ.get("TMUX", "")
    pane = os.environ.get("TMUX_PANE", "")
    if not tmux or not pane:
        return False
    socket_path = tmux.split(",", 1)[0] if "," in tmux else ""
    base_cmd = ["tmux"]
    if socket_path and Path(socket_path).exists():
        base_cmd = ["tmux", "-S", socket_path]
    env = os.environ.copy()
    env.pop("TMUX", None)
    buffer_name = f"adl-{int(time.time())}"
    try:
        subprocess.run([*base_cmd, "set-buffer", "-b", buffer_name, "--", prompt], check=True, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.0)
        subprocess.run([*base_cmd, "paste-buffer", "-d", "-b", buffer_name, "-t", pane], check=True, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.5)
        subprocess.run([*base_cmd, "send-keys", "-t", pane, "Enter"], check=True, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.7)
        subprocess.run([*base_cmd, "send-keys", "-t", pane, "Enter"], check=True, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as exc:
        log(f"tmux-continue-failed error={exc}")
        return False


def main() -> int:
    if len(sys.argv) < 2:
        return 0
    try:
        payload = json.loads(sys.argv[-1])
    except json.JSONDecodeError:
        return 0
    if payload.get("type") != "agent-turn-complete":
        return 0

    thread_id = str(payload.get("thread-id") or "default")
    turn_id = str(payload.get("turn-id") or "")
    cwd = payload.get("cwd") or os.getcwd()
    message = extract_codex_message(payload)
    decision = classify_response(message)

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
    except FileExistsError:
        return 0

    try:
        thread = load_state("codex", thread_id)
        if thread.get("last_turn_id") == turn_id:
            return 0
        if not decision.continue_loop:
            reset_state("codex", thread_id, last_turn_id=turn_id, last_focus="", last_triggered_at=0)
            log(f"stop thread={thread_id} turn={turn_id}")
            return 0
        if time.time() - int(thread.get("last_triggered_at", 0)) < COOLDOWN_SECONDS:
            return 0

        allowed, next_state = advance("codex", thread_id, decision.signature, max_repeat=MAX_REPEAT, max_depth=MAX_DEPTH)
        next_state.update({
            "last_turn_id": turn_id,
            "last_triggered_at": int(time.time()),
            "last_focus": decision.focus,
        })
        save_state("codex", thread_id, next_state)
        if not allowed:
            log(
                "loop-guard-stop "
                f"thread={thread_id} turn={turn_id} depth={next_state.get('depth', 0)} repeat={next_state.get('repeat_count', 0)}"
            )
            return 0

        prompt = decision.prompt
        log(f"continue thread={thread_id} turn={turn_id} focus={decision.focus!r}")
        if try_tmux_continue(prompt):
            return 0

        proc = subprocess.Popen(
            ["codex", "exec", "resume", thread_id, prompt, "--dangerously-bypass-approvals-and-sandbox"],
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        log(f"resume-spawn pid={proc.pid} thread={thread_id}")
        return 0
    finally:
        try:
            LOCK_FILE.unlink()
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
