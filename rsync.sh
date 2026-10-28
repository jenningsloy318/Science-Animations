#!/bin/bash
# Mirror the git-tracked site to the web servers.
#
#   ./rsync.sh        preview deletions per host, ask, then deploy
#   ./rsync.sh -y     deploy without asking
#   ./rsync.sh -n     dry run only: show what would change, touch nothing
#
# --delete makes the remote match local: files moved or deleted locally are
# removed remotely. Only git-tracked files are deployed; untracked/ignored files
# (notes, drafts, images, papers/) are excluded, and excluded paths are never
# deleted on the remote.
set -euo pipefail
cd "$(dirname "$0")"

HOSTS=(vps4 vps5)
DEST=/var/www/html/

# Server-only content that does NOT come from this repo. Never deleted.
# Add an entry here before deploying anything else into $DEST by hand.
PROTECT=(
  /temple-of-heaven/
  /workbench-robot/
  /forest-road/
  /caddy
  /ws-*.png
  /uphill-mid.png
)

MODE=ask
case "${1:-}" in
  -y) MODE=yes ;;
  -n) MODE=dry ;;
  "") ;;
  *) echo "usage: $0 [-y|-n]" >&2; exit 2 ;;
esac

# Untracked + ignored paths, anchored at the repo root.
UNTRACKED=$(mktemp)
trap 'rm -f "$UNTRACKED"' EXIT
git ls-files --others --directory | sed 's#^#/#' > "$UNTRACKED"

sync() {  # sync <host> [extra rsync args...]
  local host=$1; shift
  local protect=()
  for p in "${PROTECT[@]}"; do protect+=(--filter="P $p"); done
  rsync -a --delete --chmod=D755,F644 "${protect[@]}" \
    --exclude=.git --exclude=.gitignore \
    --exclude=Caddyfile --exclude=Makefile --exclude=rsync.sh \
    --exclude=.playwright-mcp --exclude=.worktree --exclude=caddy-storage --exclude=.pi \
    --exclude=papers \
    --exclude-from="$UNTRACKED" \
    "$@" ./ "$host:$DEST"
}

for host in "${HOSTS[@]}"; do
  echo "==> $host:$DEST"
  if [[ $MODE != yes ]]; then
    plan=$(sync "$host" --dry-run --itemize-changes)
    dels=$(grep '^\*deleting' <<<"$plan" | awk '{print $2}' || true)
    ups=$(grep -vc '^\*deleting' <<<"$plan" || true)
    echo "    $ups to copy/update, $(grep -c . <<<"$dels" || true) to delete"
    [[ -n $dels ]] && sed 's/^/    - /' <<<"$dels"
    [[ $MODE == dry ]] && continue
    read -rp "    Proceed with $host? [y/N] " ok
    [[ $ok == [yY] ]] || { echo "    skipped"; continue; }
  fi
  sync "$host" --info=stats1
done
