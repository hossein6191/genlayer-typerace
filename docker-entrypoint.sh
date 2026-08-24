#!/bin/sh
set -e

# A platform-mounted volume (Railway, Fly, a plain docker -v) arrives owned by
# root, while the server runs as the unprivileged "node" user. Without this the
# very first write fails with SQLITE_CANTOPEN. Take ownership while we still
# have root, then drop privileges for the actual process.

DATABASE_FILE="${DATABASE_FILE:-/app/server/data/genlayer-typerace.db}"
DATA_DIR=$(dirname "$DATABASE_FILE")

mkdir -p "$DATA_DIR"

if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA_DIR" || echo "[entrypoint] could not chown $DATA_DIR, continuing"
  exec su-exec node "$@"
fi

exec "$@"
