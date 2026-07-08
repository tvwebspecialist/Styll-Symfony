<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:security-rules -->
## Security — Non-Negotiable Rules

### NEVER write secret keys inline in shell commands

**FORBIDDEN** — will expose the key in shell history, logs, tool results:
```bash
# ❌ NEVER DO THIS
curl -H "Authorization: Bearer sb_secret_abc123..." https://...
curl -H "apikey: eyJhbGciOiJIUzI1NiI..." https://...
```

**REQUIRED** — always read from environment variables:
```bash
# ✅ ALWAYS DO THIS
source apps/web/.env.local
curl -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
     -H "apikey: $SUPABASE_SECRET_KEY" \
     https://$NEXT_PUBLIC_SUPABASE_URL/rest/v1/...
```

This rule applies to ALL credentials: Supabase service_role key, anon key,
Resend API key, Sentry DSN, any token or secret. No exceptions.

If you need to query Supabase ad-hoc (e.g., to find a test slug or verify data),
use `node scripts/test-e2e.js` or write a temporary script that reads from
`.env.local` via `fs.readFileSync` — never paste the key value directly.

**If a key is ever written inline in a bash command:** stop immediately,
inform the user, and recommend rotating the key via the provider dashboard
before continuing any work.
<!-- END:security-rules -->
