#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SOURCE="$SCRIPT_DIR/.github/agents"
AGENTS_TARGET="$HOME/.copilot/agents"
SKILLS_SOURCE="$SCRIPT_DIR/.github/skills"
SKILLS_TARGET="$HOME/.copilot/skills"

agents=(
  "eux-java-dev.agent.md"
  "eux-kotlin-dev.agent.md"
  "eux-full-stack-dev.agent.md"
)

skills=(
  "jira-ten"
  "odin-plan"
  "odin-jira"
  "deploy-branch"
)

# Verify source files exist
for agent in "${agents[@]}"; do
  if [[ ! -f "$AGENTS_SOURCE/$agent" ]]; then
    echo "❌ Source file not found: $AGENTS_SOURCE/$agent"
    exit 1
  fi
done
for skill in "${skills[@]}"; do
  if [[ ! -d "$SKILLS_SOURCE/$skill" ]]; then
    echo "❌ Source dir not found: $SKILLS_SOURCE/$skill"
    exit 1
  fi
done

echo "This will create symlinks:"
echo ""
echo "Agents → $AGENTS_TARGET:"
for agent in "${agents[@]}"; do
  echo "  $AGENTS_TARGET/$agent → $AGENTS_SOURCE/$agent"
done
echo ""
echo "Skills → $SKILLS_TARGET:"
for skill in "${skills[@]}"; do
  echo "  $SKILLS_TARGET/$skill → $SKILLS_SOURCE/$skill"
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
for skill in "${skills[@]}"; do
  target="$SKILLS_TARGET/$skill"
  if [[ -e "$target" && ! -L "$target" ]]; then
    conflicts+=("$target (regular file/dir)")
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

# Create target directories
for dir in "$AGENTS_TARGET" "$SKILLS_TARGET"; do
  if [[ ! -d "$dir" ]]; then
    echo "Creating $dir"
    mkdir -p "$dir"
  fi
done

# Create agent symlinks
for agent in "${agents[@]}"; do
  ln -sf "$AGENTS_SOURCE/$agent" "$AGENTS_TARGET/$agent"
  echo "✅ $agent"
done

# Create skill symlinks (directory symlinks)
for skill in "${skills[@]}"; do
  ln -sfn "$SKILLS_SOURCE/$skill" "$SKILLS_TARGET/$skill"
  echo "✅ $skill/"
done

echo ""
echo "Done. Agents linked from $AGENTS_TARGET, skills linked from $SKILLS_TARGET"
