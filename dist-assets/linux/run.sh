#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

TERM="$ROOT/term/alacritty.AppImage"
CONFIG="$ROOT/term/alacritty.toml"
APP="$ROOT/bylinter-cli"

if [[ ! -x "$TERM" ]]; then
  echo "error: $TERM not found or not executable"
  read -p "Press Enter to exit..."
  exit 1
fi

if [[ ! -x "$APP" ]]; then
  echo "error: $APP not found or not executable"
  read -p "Press Enter to exit..."
  exit 1
fi

"$TERM" --config-file "$CONFIG" --working-directory "$ROOT" -e "$APP" $@
