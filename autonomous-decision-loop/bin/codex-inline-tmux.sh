#!/usr/bin/env bash
set -euo pipefail

WORKDIR="${CODEX_INLINE_WORKDIR:-$PWD}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "${ROOT_DIR}/.env.install" ]]; then
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.install"
fi

resolve_real_codex() {
  local candidate resolved
  while IFS= read -r candidate; do
    [[ -n "${candidate}" ]] || continue
    resolved="$(readlink -f "${candidate}" 2>/dev/null || printf '%s' "${candidate}")"
    [[ -x "${resolved}" ]] || continue
    [[ "${resolved}" == "$(readlink -f "${BASH_SOURCE[0]}")" ]] && continue
    printf '%s\n' "${resolved}"
    return 0
  done < <(
    {
      [[ -n "${CODEX_REAL_BIN:-}" ]] && printf '%s\n' "${CODEX_REAL_BIN}"
      [[ -n "${ADL_REAL_CODEX_BIN:-}" ]] && printf '%s\n' "${ADL_REAL_CODEX_BIN}"
      which -a codex 2>/dev/null || true
      printf '%s\n' "/usr/local/bin/codex"
    } | awk '!seen[$0]++'
  )
  return 1
}

REAL_CODEX="$(resolve_real_codex || true)"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for Codex ADL" >&2
  exit 1
fi
if [[ -z "${REAL_CODEX}" ]]; then
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
tmux new-session -d -s "${session}" -c "${WORKDIR}" "${launch}" >/dev/null
tmux set-option -t "${session}" mouse on >/dev/null
tmux set-option -t "${session}" status off >/dev/null
exec tmux attach-session -t "${session}"
