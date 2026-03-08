#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import runpy
import sys


def main(argv: list[str] | None = None) -> int:
    root = Path(__file__).resolve().parents[2]
    script = root / "scripts" / "install.py"
    sys.argv = [str(script), *(argv if argv is not None else sys.argv[1:])]
    runpy.run_path(str(script), run_name="__main__")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
