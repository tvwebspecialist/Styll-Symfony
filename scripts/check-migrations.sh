#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

collect_changed_migrations() {
  local -a files=()

  if [[ -n "${GITHUB_BASE_REF:-}" ]] && git rev-parse --verify "origin/${GITHUB_BASE_REF}" >/dev/null 2>&1; then
    local merge_base
    merge_base="$(git merge-base "origin/${GITHUB_BASE_REF}" HEAD)"
    while IFS= read -r file; do
      [[ -n "$file" ]] || continue
      files+=("$file")
    done < <(git diff --name-only --diff-filter=ACMR "$merge_base"...HEAD -- 'supabase/migrations/*.sql')
  else
    while IFS= read -r file; do
      [[ -n "$file" ]] || continue
      files+=("$file")
    done < <(git status --short --untracked-files=all -- supabase/migrations | awk '{print $2}')
  fi

  if [[ "${#files[@]}" -eq 0 ]]; then
    return 0
  fi

  printf '%s\n' "${files[@]}" | sort -u
}

migration_files="$(collect_changed_migrations || true)"

if [[ -z "${migration_files}" ]]; then
  echo "No changed migrations to lint."
  exit 0
fi

status=0

while IFS= read -r migration; do
  [[ -n "$migration" ]] || continue
  [[ -f "$migration" ]] || continue

  if rg -n 'SECURITY DEFINER' "$migration" >/dev/null \
    && ! rg -n 'SET search_path|ALTER FUNCTION .* SET search_path' "$migration" >/dev/null; then
    echo "Changed SECURITY DEFINER migration must set search_path: $migration"
    status=1
  fi
done <<<"$migration_files"

exit "$status"
