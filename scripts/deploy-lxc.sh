#!/usr/bin/env sh
set -eu

# node_modules is intentionally not committed to git. Run this after a fresh
# clone or pull on an LXC/systemd install so runtime dependencies are present.
APP_DIR="${APP_DIR:-/opt/nodecast-tv}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-nodecast-tv}"

cd "$APP_DIR"

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git fetch origin "$BRANCH"
  git merge --ff-only "origin/$BRANCH"
fi

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

systemctl restart "$SERVICE"
systemctl --no-pager --full status "$SERVICE"
