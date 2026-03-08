#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-dir", required=True)
    args = parser.parse_args()
    repo_dir = Path(args.repo_dir).resolve()
    claude_plugins = Path.home() / ".claude" / "plugins"
    codex_config = Path.home() / ".codex" / "config.toml"
    print(json.dumps({
        "repo_dir": str(repo_dir),
        "claude_marketplace_known": (claude_plugins / "known_marketplaces.json").exists(),
        "claude_installed_plugins": (claude_plugins / "installed_plugins.json").exists(),
        "codex_config_exists": codex_config.exists(),
        "codex_notify_target": str(repo_dir / "runtime" / "codex_notify.py"),
    }, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
