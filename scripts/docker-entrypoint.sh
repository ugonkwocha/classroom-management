#!/bin/sh
set -eu

prepare_storage_directory() {
  storage_path="$1"
  [ -n "$storage_path" ] || return 0

  case "$storage_path" in
    /app/storage|/app/storage/*)
      mkdir -p "$storage_path"
      chown -R node:node "$storage_path"
      ;;
    *)
      echo "Storage path must be inside /app/storage: $storage_path" >&2
      exit 1
      ;;
  esac
}

mkdir -p /app/storage
chown node:node /app/storage
prepare_storage_directory "${CERTIFICATE_STORAGE_DIR:-}"
prepare_storage_directory "${PAYMENT_PROOF_STORAGE_DIR:-}"

exec su-exec node "$@"
