#!/bin/bash
set -e

# Determine platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64) BINARY="claude-maestro-macos-arm64" ;;
      x86_64) BINARY="claude-maestro-macos-x64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  linux)
    BINARY="claude-maestro-linux-x64"
    ;;
  mingw*|msys*|cygwin*)
    BINARY="claude-maestro-windows-x64.exe"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Download binary from latest release to ~/.local/bin
REPO="say828/say828-claude-market"
RELEASE_URL="https://github.com/$REPO/releases/latest/download/$BINARY"
INSTALL_DIR="$HOME/.local/bin"

mkdir -p "$INSTALL_DIR"
echo "Downloading $BINARY to $INSTALL_DIR/claude-maestro..."
curl -fsSL "$RELEASE_URL" -o "$INSTALL_DIR/claude-maestro"
chmod +x "$INSTALL_DIR/claude-maestro"

# Check if ~/.local/bin is in PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
    echo ""
    echo "WARNING: $INSTALL_DIR is not in your PATH"
    echo "Add it to your shell config:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo "Done! claude-maestro installed to $INSTALL_DIR/claude-maestro"
