#!/bin/bash
# Wrapper script: downloads binary if not present, then runs it

INSTALL_DIR="$HOME/.local/bin"
BINARY="$INSTALL_DIR/claude-maestro"
REPO="say828/say828-claude-market"

# Download if not exists or force update
if [ ! -f "$BINARY" ] || [ "$YOURTURN_UPDATE" = "1" ]; then
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        darwin)
            case "$ARCH" in
                arm64) BIN_NAME="claude-maestro-macos-arm64" ;;
                x86_64) BIN_NAME="claude-maestro-macos-x64" ;;
                *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
            esac
            ;;
        linux) BIN_NAME="claude-maestro-linux-x64" ;;
        *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
    esac

    mkdir -p "$INSTALL_DIR"
    RELEASE_URL="https://github.com/$REPO/releases/latest/download/$BIN_NAME"
    curl -fsSL "$RELEASE_URL" -o "$BINARY" 2>/dev/null
    chmod +x "$BINARY"
fi

exec "$BINARY" "$@"
