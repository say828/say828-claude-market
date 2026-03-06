#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="say828/say828-agent-market"
INSTALL_DIR="${HOME}/.local/bin"
CODEX_SKILLS_DIR="${HOME}/.codex/skills"
TMP_ROOT=""
REPO_DIR=""
INSTALL_CLAUDE=1
INSTALL_CODEX=1

usage() {
  cat <<'EOF'
Usage:
  install.sh [--repo-dir PATH] [--claude-only | --codex-only]

Installs:
  - Claude binary + marketplace instructions
  - Codex skills: planning-with-files, codex-hud

Options:
  --repo-dir PATH  Use a local repository checkout instead of downloading one
  --claude-only    Install only Claude assets
  --codex-only     Install only Codex assets
  --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-dir)
      REPO_DIR="${2:-}"
      shift 2
      ;;
    --claude-only)
      INSTALL_CLAUDE=1
      INSTALL_CODEX=0
      shift
      ;;
    --codex-only)
      INSTALL_CLAUDE=0
      INSTALL_CODEX=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ -n "${TMP_ROOT}" && -d "${TMP_ROOT}" ]]; then
    rm -rf "${TMP_ROOT}"
  fi
}
trap cleanup EXIT

ensure_repo_checkout() {
  if [[ -n "${REPO_DIR}" ]]; then
    if [[ ! -d "${REPO_DIR}" ]]; then
      echo "Repository path not found: ${REPO_DIR}" >&2
      exit 1
    fi
    return
  fi

  TMP_ROOT="$(mktemp -d)"
  archive_url="https://github.com/${REPO_SLUG}/archive/refs/heads/main.tar.gz"
  archive_path="${TMP_ROOT}/repo.tar.gz"
  curl -fsSL -o "${archive_path}" "${archive_url}"
  tar -xzf "${archive_path}" -C "${TMP_ROOT}"
  REPO_DIR="$(find "${TMP_ROOT}" -maxdepth 1 -mindepth 1 -type d -name '*agent-market*' | head -n 1)"

  if [[ -z "${REPO_DIR}" || ! -d "${REPO_DIR}" ]]; then
    echo "Failed to prepare repository checkout for ${REPO_SLUG}" >&2
    exit 1
  fi
}

install_claude_binary() {
  case "$(uname -s)" in
    Darwin) os="macos" ;;
    Linux)  os="linux" ;;
    *)      echo "Unsupported OS. Use Windows installer instead." >&2; exit 1 ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64)   arch="x64" ;;
    arm64|aarch64)  arch="arm64" ;;
    *)              echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  binary_name="claude-orchestrator-${os}-${arch}"
  legacy_binary_name="claude-maestro-${os}-${arch}"

  echo "Fetching latest claude-orchestrator release..."
  latest_tag="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/releases/latest" | grep '"tag_name"' | cut -d'"' -f4)"

  if [[ -z "${latest_tag}" ]]; then
    echo "Failed to fetch latest version" >&2
    exit 1
  fi

  echo "Installing claude-orchestrator ${latest_tag}..."

  mkdir -p "${INSTALL_DIR}"

  tmp_file="$(mktemp)"
  binary_url="https://github.com/${REPO_SLUG}/releases/download/${latest_tag}/${binary_name}"
  legacy_binary_url="https://github.com/${REPO_SLUG}/releases/download/${latest_tag}/${legacy_binary_name}"

  echo "Downloading ${binary_url}..."
  if ! curl -fsSL -o "${tmp_file}" "${binary_url}"; then
    echo "Primary binary asset not found, trying legacy release asset ${legacy_binary_name}..."
    curl -fsSL -o "${tmp_file}" "${legacy_binary_url}"
  fi

  mv "${tmp_file}" "${INSTALL_DIR}/claude-orchestrator"
  chmod +x "${INSTALL_DIR}/claude-orchestrator"

  echo
  echo "claude-orchestrator ${latest_tag} installed to ${INSTALL_DIR}/claude-orchestrator"

  if ! echo "${PATH}" | tr ':' '\n' | grep -qx "${INSTALL_DIR}"; then
    echo
    echo "${INSTALL_DIR} is not in your PATH. Add it with:"
    echo

    case "${SHELL:-}" in
      */zsh)  shell_config="~/.zshrc" ;;
      */bash) shell_config="~/.bashrc" ;;
      *)      shell_config="your shell config" ;;
    esac

    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ${shell_config}"
    echo "  source ${shell_config}"
  fi
}

install_codex_skill() {
  local skill_name="$1"
  local source_dir="${REPO_DIR}/codex/skills/${skill_name}"
  local target_dir="${CODEX_SKILLS_DIR}/${skill_name}"

  if [[ ! -d "${source_dir}" ]]; then
    echo "Missing Codex skill directory: ${source_dir}" >&2
    exit 1
  fi

  mkdir -p "${CODEX_SKILLS_DIR}"
  rm -rf "${target_dir}"
  cp -R "${source_dir}" "${target_dir}"
}

install_codex_skills() {
  ensure_repo_checkout
  echo "Installing Codex skills into ${CODEX_SKILLS_DIR}..."
  install_codex_skill "planning-with-files"
  install_codex_skill "codex-hud"
  echo "Installed Codex skills: planning-with-files, codex-hud"
}

main() {
  if [[ "${INSTALL_CLAUDE}" -eq 1 ]]; then
    install_claude_binary
  fi

  if [[ "${INSTALL_CODEX}" -eq 1 ]]; then
    install_codex_skills
  fi

  echo
  echo "=========================================="
  echo "  INSTALLATION COMPLETE!"
  echo "=========================================="
  echo
  if [[ "${INSTALL_CLAUDE}" -eq 1 ]]; then
    echo "Install the Claude Code plugin:"
    echo "  /plugin marketplace add ${REPO_SLUG}"
    echo "  /plugin install claude-orchestrator@say828-agent-market"
    echo "  /plugin install ship@say828-agent-market"
    echo
  fi
  if [[ "${INSTALL_CODEX}" -eq 1 ]]; then
    echo "Installed Codex skills:"
    echo "  - planning-with-files"
    echo "  - codex-hud"
    echo
    echo "Use them by name in Codex prompts after restart if needed."
    echo
  fi
}

main "$@"
