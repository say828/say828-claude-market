#!/usr/bin/env bash
set -euo pipefail

WORKDIR="${CODEX_INLINE_WORKDIR:-$PWD}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${HOME}/.local/share/say828-agent-market/codex.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi
REAL_CODEX="${CODEX_REAL_BIN:-$(which -a codex | awk 'NR==2 {print; exit}')}"
SOCKET_NAME="${CODEX_INLINE_TMUX_SOCKET:-codex-inline}"
TMUX_CMD=(tmux -L "${SOCKET_NAME}")

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for Codex ADL" >&2
  exit 1
fi
if [[ -z "${REAL_CODEX}" || ! -x "${REAL_CODEX}" ]]; then
  echo "real Codex binary not found" >&2
  exit 1
fi

has_yolo_flag() {
  local arg
  for arg in "$@"; do
    [[ "${arg}" == "--yolo" ]] && return 0
  done
  return 1
}

build_cmd() {
  local -a cmd=("env" "CODEX_INLINE_TMUX_ACTIVE=1" "CODEX_INLINE_TMUX_SESSION=${session}" "${REAL_CODEX}")
  if ! has_yolo_flag "$@"; then
    cmd+=(--yolo)
  fi
  cmd+=("$@")
  local quoted=""
  printf -v quoted '%q ' "${cmd[@]}"
  printf '%s' "${quoted% }"
}

slug="$(basename "${WORKDIR}" | tr -c '[:alnum:]' '-')"
session="codex-adl-${slug}-$(date +%Y%m%d-%H%M%S)-$$"
launch="$(build_cmd "$@")"

"${TMUX_CMD[@]}" new-session -d -s "${session}" -c "${WORKDIR}" "${launch}" >/dev/null
"${TMUX_CMD[@]}" set-option -t "${session}" mouse on >/dev/null
"${TMUX_CMD[@]}" set-option -t "${session}" status off >/dev/null

exec "${TMUX_CMD[@]}" attach-session -t "${session}"
