#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

tmp_matches="$(mktemp)"
trap 'rm -f "$tmp_matches"' EXIT

# High-signal tracked-secret patterns only. Example/docs placeholders are excluded.
git grep -nE \
  -e \
  '-----BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY-----|sb_secret_[A-Za-z0-9._-]{12,}|(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|ANTHROPIC_API_KEY|CRON_SECRET|VAPID_PRIVATE_KEY|SENTRY_AUTH_TOKEN|OPENAI_API_KEY)=[^[:space:]#]{12,}' \
  -- \
  . \
  ':(exclude).env.example' \
  ':(exclude)LOCAL_DEV_SETUP.md' \
  ':(exclude)apps/web/TEAM_INVITATIONS_SETUP.md' \
  ':(exclude)apps/web/BUG_FIX_REPORT.md' \
  ':(exclude)apps/web/AGENTS.md' \
  >"$tmp_matches" || true

if [[ -s "$tmp_matches" ]]; then
  echo "Potential tracked secrets detected:"
  cat "$tmp_matches"
  exit 1
fi

echo "No high-signal tracked secrets found."
