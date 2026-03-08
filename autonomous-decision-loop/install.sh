#!/usr/bin/env bash
set -euo pipefail

MARKET_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 "${MARKET_ROOT}/scripts/install_adl.py" --repo-dir "${MARKET_ROOT}"
