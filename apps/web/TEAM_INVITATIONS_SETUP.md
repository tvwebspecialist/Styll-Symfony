# Team Invitations — Setup Guide

## Prerequisites

The team invitation feature requires:

1. **Supabase Database Migration** — The `team_invitations` table
2. **Resend API Key** — For sending invitation emails
3. **Environment Configuration** — API keys in `.env.local`

## Step 1: Apply Database Migration

The migration `20260430000001_team_invitations.sql` must be applied to your Supabase database.

### Option A: Using Supabase CLI (Recommended)

```bash
cd supabase
supabase migration list   # Check if migration is applied
supabase db push          # Apply pending migrations
```

### Option B: Manual SQL in Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire content of `supabase/migrations/20260430000001_team_invitations.sql`
4. Paste it into the SQL editor and execute

**Verify migration was applied:**
```bash
supabase migration list
# You should see: 20260430000001_team_invitations ... applied
```

## Step 2: Configure Resend Email Service

### Get Resend API Key

1. Visit https://resend.com
2. Sign up or log in
3. Go to API Keys (https://resend.com/api-keys)
4. Create a new API key
5. Copy the key (it will start with `re_`)

### Add to .env.local

```
RESEND_API_KEY=re_YOUR_API_KEY_HERE
```

**Example:**
```
RESEND_API_KEY=re_1234567890abcdef1234567890abcdef
```

## Step 3: Verify Configuration

```bash
# Check that both values are set
grep -E "RESEND_API_KEY|NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local
```

Expected output:
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
RESEND_API_KEY=re_...
```

## Step 4: Test the Feature

1. Start the development server: `npm run dev`
2. Go to `/dashboard/team`
3. Click "Invita membro" button
4. Fill in:
   - Email: `test@example.com`
   - Role: `staff`
5. Click "Invia invito"

**Expected results:**
- ✅ "Invito inviato a test@example.com" toast appears
- ✅ Invitation record created in database
- ✅ Email sent to recipient (check Resend dashboard for logs)

## Troubleshooting

### Error: "Email service not configured"

**Cause:** `RESEND_API_KEY` is missing from `.env.local`

**Fix:**
```bash
# Add to apps/web/.env.local
RESEND_API_KEY=re_YOUR_KEY_HERE
```

### Error: "Errore nella creazione dell'invito" or database-related error

**Cause:** The `team_invitations` table was not created

**Fix:**
```bash
supabase db push
```

Then restart the dev server: `npm run dev`

### Error: "Errore nell'invio dell'email"

**Cause:** Invalid Resend API key or account not properly configured

**Fix:**
1. Verify API key at https://resend.com/api-keys
2. Check that Resend account is active
3. Update `.env.local` with the correct key
4. Restart dev server

### Email not received by recipient

1. Check Resend dashboard for delivery status: https://resend.com/emails
2. Check spam/junk folder
3. Verify recipient email is correct
4. Try with a verified domain (free tier may have restrictions)

## Architecture

### Database Schema

```sql
team_invitations (
  id UUID PRIMARY KEY
  tenant_id UUID → tenants (Foreign Key)
  email TEXT
  token TEXT (Unique, randomly generated)
  role TEXT (owner|manager|staff|receptionist)
  created_by UUID → profiles (Foreign Key)
  created_at TIMESTAMPTZ
  expires_at TIMESTAMPTZ (Default: now() + 7 days)
  accepted_at TIMESTAMPTZ (NULL until accepted)
  status TEXT (pending|accepted|expired|cancelled)
)
```

### Invitation Flow

1. **Owner invites**: Fills email + role → `inviteTeamMember()` action
2. **Validation**: Checks permissions, duplicate invitations, existing staff
3. **Token Generation**: Secure random token created
4. **DB Save**: Invitation record inserted with `status='pending'`
5. **Email Sent**: Resend sends HTML email with acceptance link
6. **Member Clicks**: Lands on `/invite?token=xxx`
7. **Acceptance**: Staff member record created, invitation marked as `accepted`
8. **Onboarding**: Member completes `/onboarding/member` flow

### Error Handling

All errors are caught and returned in structured format:
```typescript
{ success: false, error: "Description of what went wrong" }
```

This allows the UI to display meaningful messages to the user.

## API Reference

### inviteTeamMember()

**Location:** `src/lib/actions/team.ts`

```typescript
inviteTeamMember(
  email: string,
  role: 'owner' | 'manager' | 'staff' | 'receptionist'
): Promise<{ success: boolean; error?: string }>
```

**Permissions:** Owner or Manager only

**Errors:**
- `"Tenant non trovato"` — User not associated with a tenant
- `"Non autenticato"` — User not logged in
- `"Non hai i permessi per invitare membri"` — User lacks permission
- `"Un invito è già stato inviato a questo email"` — Duplicate invitation pending
- `"Questo utente è già membro del team"` — Staff member already exists
- `"Errore nella generazione del token"` — Token generation failed
- `"Errore nell'invio dell'email: ..."` — Email delivery failed

### acceptInvitation()

**Location:** `src/lib/actions/invitations.ts`

```typescript
acceptInvitation(token: string, userId: string)
: Promise<{ success: boolean; error?: string; tenantId?: string }>
```

**What happens:**
- Validates token and expiry
- Creates staff member record
- Marks invitation as accepted
- Returns tenant ID for redirect

## Notes for Developers

- Invitation tokens are secure random 64-character hex strings
- Invitations expire after 7 days and are marked as `expired`
- Once accepted, an invitation cannot be used again
- The email service gracefully handles missing API keys (returns error)
- All database operations are scoped to the correct tenant (multi-tenant safety)
