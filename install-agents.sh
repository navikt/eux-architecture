#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SOURCE="$SCRIPT_DIR/.github/agents"
AGENTS_TARGET="$HOME/.copilot/agents"

agents=(
  "eux-java-dev.agent.md"
  "eux-kotlin-dev.agent.md"
  "eux-full-stack-dev.agent.md"
)

# Verify source files exist
for agent in "${agents[@]}"; do
  if [[ ! -f "$AGENTS_SOURCE/$agent" ]]; then
    echo "❌ Source file not found: $AGENTS_SOURCE/$agent"
    exit 1
  fi
done

echo "This will create symlinks in $AGENTS_TARGET:"
echo ""
for agent in "${agents[@]}"; do
  echo "  $AGENTS_TARGET/$agent → $AGENTS_SOURCE/$agent"
done
echo ""

# Check for existing files that would be overwritten
conflicts=()
for agent in "${agents[@]}"; do
  target="$AGENTS_TARGET/$agent"
  if [[ -e "$target" && ! -L "$target" ]]; then
    conflicts+=("$target (regular file)")
  elif [[ -L "$target" ]]; then
    conflicts+=("$target (existing symlink → $(readlink "$target"))")
  fi
done

if [[ ${#conflicts[@]} -gt 0 ]]; then
  echo "⚠️  The following will be overwritten:"
  for c in "${conflicts[@]}"; do
    echo "  $c"
  done
  echo ""
fi

read -rp "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Create target directory
if [[ ! -d "$AGENTS_TARGET" ]]; then
  echo "Creating $AGENTS_TARGET"
  mkdir -p "$AGENTS_TARGET"
fi

# Create symlinks
for agent in "${agents[@]}"; do
  ln -sf "$AGENTS_SOURCE/$agent" "$AGENTS_TARGET/$agent"
  echo "✅ $agent"
done

echo ""
echo "Done. Agent files are linked from $AGENTS_TARGET"
