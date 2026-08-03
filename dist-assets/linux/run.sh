#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

WEZTERM="$ROOT/wezterm/WezTerm.AppImage"
CONFIG="$ROOT/wezterm/termconfig.lua"
APP="$ROOT/bylinter-cli"

if [[ ! -x "$WEZTERM" ]]; then
  echo "error: $WEZTERM not found or not executable"
  read -p "Press Enter to exit..."
  exit 1
fi

if [[ ! -x "$APP" ]]; then
  echo "error: $APP not found or not executable"
  read -p "Press Enter to exit..."
  exit 1
fi

__NV_DISABLE_EXPLICIT_SYNC=1 "$WEZTERM" --config-file "$CONFIG" start --cwd "$ROOT" -- "$APP" $@
