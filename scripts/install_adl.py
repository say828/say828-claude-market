#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from datetime import UTC, datetime

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None

MARKETPLACE_NAME = "say828-agent-market"
PLUGIN_NAME = "autonomous-decision-loop"
REPO_SLUG = "say828/say828-agent-market"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def save_json(path: Path, data) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n")


def git_sha(repo_dir: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo_dir), "rev-parse", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def plugin_version(repo_dir: Path) -> str:
    manifest = load_json(repo_dir / "plugins" / PLUGIN_NAME / ".claude-plugin" / "plugin.json", {})
    return str(manifest.get("version") or "0.0.0")


def install_claude(repo_dir: Path) -> None:
    plugins_root = Path.home() / ".claude" / "plugins"
    marketplace_path = plugins_root / "marketplaces" / MARKETPLACE_NAME
    installed_path = plugins_root / "installed" / PLUGIN_NAME
    known_marketplaces_path = plugins_root / "known_marketplaces.json"
    installed_plugins_path = plugins_root / "installed_plugins.json"

    ensure_dir(marketplace_path.parent)
    ensure_dir(installed_path.parent)

    if marketplace_path.exists() or marketplace_path.is_symlink():
        if marketplace_path.is_symlink() or marketplace_path.is_file():
            marketplace_path.unlink()
        else:
            shutil.rmtree(marketplace_path)
    marketplace_path.symlink_to(repo_dir)

    plugin_source = repo_dir / "plugins" / PLUGIN_NAME
    if installed_path.exists() or installed_path.is_symlink():
        if installed_path.is_symlink() or installed_path.is_file():
            installed_path.unlink()
        else:
            shutil.rmtree(installed_path)
    installed_path.symlink_to(plugin_source)

    known = load_json(known_marketplaces_path, {})
    known[MARKETPLACE_NAME] = {
        "source": {"source": "github", "repo": REPO_SLUG},
        "installLocation": str(marketplace_path),
    }
    save_json(known_marketplaces_path, known)

    installed = load_json(installed_plugins_path, {"plugins": {}})
    plugin_id = f"{PLUGIN_NAME}@{MARKETPLACE_NAME}"
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    installed.setdefault("plugins", {})[plugin_id] = [{
        "scope": "user",
        "installPath": str(installed_path),
        "version": plugin_version(repo_dir),
        "installedAt": now,
        "lastUpdated": now,
        "gitCommitSha": git_sha(repo_dir),
    }]
    save_json(installed_plugins_path, installed)

    settings_path = Path.home() / ".claude" / "settings.json"
    settings = load_json(settings_path, {})
    hooks = settings.setdefault("hooks", {})
    command = f"python3 {repo_dir / 'plugins' / PLUGIN_NAME / 'hooks' / 'stop_hook.py'}"
    for event in ("Stop", "SubagentStop"):
        entries = hooks.setdefault(event, [])
        desired = {"hooks": [{"type": "command", "command": command}]}
        if desired not in entries:
            entries.append(desired)
    save_json(settings_path, settings)


def update_codex_config(config_path: Path, notify_command: list[str], previous_notify_path: Path) -> None:
    raw = config_path.read_text() if config_path.exists() else ""
    existing_notify = None
    if tomllib and raw.strip():
        try:
            parsed = tomllib.loads(raw)
            if isinstance(parsed.get("notify"), list):
                existing_notify = parsed.get("notify")
        except Exception:
            existing_notify = None
    if existing_notify and existing_notify != notify_command:
        save_json(previous_notify_path, {"command": existing_notify})
    elif not previous_notify_path.exists():
        save_json(previous_notify_path, {})

    notify_line = "notify = [" + ", ".join(json.dumps(item) for item in notify_command) + "]"
    lines = raw.splitlines()
    replaced = False
    new_lines: list[str] = []
    for line in lines:
        if line.strip().startswith("notify ="):
            new_lines.append(notify_line)
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        insert_at = 0
        while insert_at < len(new_lines) and new_lines[insert_at].startswith(("model", "approval_policy", "sandbox_mode", "model_reasoning_effort")):
            insert_at += 1
        new_lines.insert(insert_at, notify_line)
    output = "\n".join(new_lines).strip() + "\n"
    config_path.write_text(output)


def resolve_real_codex(wrapper_paths: set[Path]) -> str:
    skip_paths = {path.resolve() for path in wrapper_paths}
    seen: set[str] = set()
    candidates: list[str] = []

    for env_name in ("CODEX_REAL_BIN", "ADL_REAL_CODEX_BIN"):
        value = str(os.environ.get(env_name, "")).strip()
        if value:
            candidates.append(value)

    for directory in os.environ.get("PATH", "").split(os.pathsep):
        if not directory:
            continue
        candidates.append(str(Path(directory) / "codex"))

    candidates.append("/usr/local/bin/codex")

    for raw in candidates:
        candidate = Path(raw).expanduser()
        resolved = candidate.resolve()
        resolved_str = str(resolved)
        if resolved_str in seen:
            continue
        seen.add(resolved_str)
        if resolved in skip_paths:
            continue
        if resolved.exists() and os.access(resolved, os.X_OK):
            return resolved_str
    return ""


def install_codex(repo_dir: Path) -> None:
    codex_root = Path.home() / ".codex"
    ensure_dir(codex_root)
    state_root = Path.home() / ".autonomous-decision-loop"
    ensure_dir(state_root)
    config_path = codex_root / "config.toml"
    previous_notify_path = state_root / "codex_previous_notify.json"
    notify_command = ["python3", str(repo_dir / "autonomous-decision-loop" / "runtime" / "codex_notify.py")]
    update_codex_config(config_path, notify_command, previous_notify_path)

    bin_dir = Path.home() / ".local" / "bin"
    ensure_dir(bin_dir)
    wrapper_target = bin_dir / "codex"
    wrapper_source = repo_dir / "codex" / "bin" / "codex"
    inline_source = repo_dir / "codex" / "bin" / "codex-inline-tmux.sh"
    real_codex = resolve_real_codex({wrapper_source, wrapper_target}) or "/usr/local/bin/codex"
    market_home = Path.home() / ".local" / "share" / "say828-agent-market"
    ensure_dir(market_home)
    env_file = market_home / "codex.env"
    env_file.write_text(f"CODEX_REAL_BIN={real_codex}\n")
    for target, source in ((wrapper_target, wrapper_source), (bin_dir / "codex-inline-tmux.sh", inline_source)):
        if target.exists() or target.is_symlink():
            if target.name == "codex" and not target.is_symlink():
                backup = bin_dir / "codex.say828-agent-market-backup"
                if backup.exists() or backup.is_symlink():
                    backup.unlink()
                shutil.move(str(target), str(backup))
            else:
                target.unlink()
        target.symlink_to(source)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-dir", required=True)
    parser.add_argument("--skip-claude", action="store_true")
    parser.add_argument("--skip-codex", action="store_true")
    args = parser.parse_args()

    repo_dir = Path(args.repo_dir).resolve()
    if not args.skip_claude:
        install_claude(repo_dir)
    if not args.skip_codex:
        install_codex(repo_dir)
    print("say828-agent-market ADL install complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
