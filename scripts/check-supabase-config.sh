#!/usr/bin/env bash
# check-supabase-config.sh
# Verifies .env.local and prints the exact URLs to configure in Supabase Dashboard.

ENV_FILE="$(dirname "$0")/../apps/web/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  $ENV_FILE not found"
  exit 1
fi

# Source only safe, non-secret vars
SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
APP_URL=$(grep -E '^NEXT_PUBLIC_APP_URL=' "$ENV_FILE" | cut -d= -f2-)

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Supabase Dashboard → Authentication → URL Configuration"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  Project URL detected: ${SUPABASE_URL:-"(not set)"}"
echo ""
echo "  ① Site URL (single value):"
echo "     https://styll.it"
echo ""
echo "  ② Redirect URLs (allow-list — add all of these):"
echo "     https://styll.it/auth/callback"
echo "     http://localhost:3000/auth/callback"
echo ""
echo "══════════════════════════════════════════════════════"
echo ""

# Check NEXT_PUBLIC_APP_URL
if [[ -z "$APP_URL" ]]; then
  echo "⚠️   NEXT_PUBLIC_APP_URL is NOT set in .env.local"
  echo "    Without it, signInWithGoogle() may build redirectTo=http://localhost:3000/auth/callback"
  echo "    in server-side contexts, which Supabase will reject (not in allow-list)."
  echo "    → Add:  NEXT_PUBLIC_APP_URL=https://styll.it"
  exit 1
else
  echo "✅  NEXT_PUBLIC_APP_URL=${APP_URL}"
  echo "    redirectTo will be: ${APP_URL}/auth/callback"
fi

echo ""
