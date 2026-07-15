#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d apps/web/.next/static ]]; then
  echo "Missing apps/web/.next/static. Run pnpm build first."
  exit 1
fi

tmp_matches="$(mktemp)"
trap 'rm -f "$tmp_matches"' EXIT

rg -n \
  --glob '*.js' \
  --glob '*.html' \
  'SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET|ANTHROPIC_API_KEY|VAPID_PRIVATE_KEY|RESEND_API_KEY|SENTRY_AUTH_TOKEN|sb_secret_' \
  apps/web/.next/static \
  >"$tmp_matches" || true

if [[ -s "$tmp_matches" ]]; then
  echo "Potential server-secret reference found in client bundle:"
  cat "$tmp_matches"
  exit 1
fi

echo "No server-secret references found in client bundle assets."
