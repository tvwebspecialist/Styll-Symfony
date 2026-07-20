import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const routeSource = readFileSync(
  resolve(process.cwd(), 'src/app/api/webhooks/meta-whatsapp/route.ts'),
  'utf8',
)

const conversationStateSource = readFileSync(
  resolve(process.cwd(), 'src/lib/messaging/conversation-state-service.ts'),
  'utf8',
)

const draftContextSource = readFileSync(
  resolve(process.cwd(), 'src/lib/ai/inbox-draft-context.ts'),
  'utf8',
)

const draftOrchestratorSource = readFileSync(
  resolve(process.cwd(), 'src/lib/ai/inbox-draft-orchestrator.ts'),
  'utf8',
)

test('meta webhook route keeps tenant scope on conversation and message echo lookups', () => {
  assert.match(
    routeSource,
    /from\('inbox_conversations'\)\s*\.select\('id, client_id'\)\s*\.eq\('tenant_id', tenantId\)\s*\.eq\('conversation_key', conversationKey\)/,
  )

  assert.match(
    routeSource,
    /from\('inbox_messages'\)\s*\.select\('id'\)\s*\.eq\('tenant_id', input\.tenantId\)\s*\.eq\('meta_message_id', input\.externalId\)/,
  )

  assert.match(
    routeSource,
    /from\('inbox_messages'\)\s*\.select\('messages_log_id'\)\s*\.eq\('tenant_id', input\.tenantId\)\s*\.eq\('meta_message_id', input\.externalId\)/,
  )

  assert.match(
    routeSource,
    /from\('messages_log'\)\s*\.select\('id'\)\s*\.eq\('tenant_id', input\.tenantId\)\s*\.eq\('provider', 'meta_whatsapp'\)\s*\.eq\('external_id', input\.externalId\)/,
  )
})

test('conversation state service keeps tenant scope on assignment persistence', () => {
  assert.match(
    conversationStateSource,
    /from\('inbox_assignments'\)\s*\.select\('id, assigned_staff_id'\)\s*\.eq\('tenant_id', to\.tenantId\)\s*\.eq\('conversation_id', from\.conversationId\)\s*\.is\('released_at', null\)/,
  )

  assert.match(
    conversationStateSource,
    /from\('inbox_assignments'\)\s*\.update\(\{\s*released_at: input\.occurredAt,\s*\}\)\s*\.eq\('tenant_id', to\.tenantId\)\s*\.eq\('id', activeAssignment\.id\)/,
  )
})

test('draft context loader enforces inbox auth and tenant-scoped reads for every dataset', () => {
  assert.match(
    draftContextSource,
    /requireInboxTenantContext\(tenantId\)/,
  )

  assert.match(
    draftContextSource,
    /from\('inbox_conversations'\)\s*\.select\('id, tenant_id, status, ownership_mode, ai_paused_at, client_id'\)\s*\.eq\('tenant_id', tenantId\)\s*\.eq\('id', conversationId\)/,
  )

  assert.match(
    draftContextSource,
    /from\('tenants'\)\s*\.select\('id, business_name, tagline, description, timezone, settings'\)\s*\.eq\('id', tenantId\)/,
  )

  assert.match(
    draftContextSource,
    /from\('services'\)\s*\.select\('id, name, description, price, duration_minutes, display_order'\)\s*\.eq\('tenant_id', tenantId\)\s*\.eq\('is_active', true\)/,
  )

  assert.match(
    draftContextSource,
    /from\('working_hours'\)\s*\.select\('id, day_of_week, start_time, end_time'\)\s*\.eq\('tenant_id', tenantId\)/,
  )

  assert.match(
    draftContextSource,
    /from\('inbox_messages'\)\s*\.select\('id, author_kind, body_text, created_at'\)\s*\.eq\('tenant_id', tenantId\)\s*\.eq\('conversation_id', conversationId\)\s*\.order\('created_at', \{ ascending: false \}\)\s*\.order\('id', \{ ascending: false \}\)\s*\.limit\(promptDefinition\.maxConversationMessages\)/,
  )

  assert.match(
    draftContextSource,
    /from\('services'\)[\s\S]*\.limit\(promptDefinition\.maxServices\)/,
  )

  assert.match(
    draftContextSource,
    /from\('working_hours'\)[\s\S]*\.limit\(promptDefinition\.maxWorkingHoursRows\)/,
  )
})

test('draft orchestrator persists and updates ai runs with explicit tenant scope', () => {
  assert.match(
    draftOrchestratorSource,
    /from\('inbox_ai_runs'\)\s*\.insert\(\{\s*tenant_id: input\.tenantId,\s*conversation_id: input\.conversationId,/,
  )

  assert.match(
    draftOrchestratorSource,
    /from\('inbox_ai_runs'\)\s*\.update\(\{[\s\S]*status: 'completed'[\s\S]*handoff_reason: input\.handoffReason[\s\S]*\}\)\s*\.eq\('tenant_id', input\.tenantId\)\s*\.eq\('id', input\.runId\)/,
  )

  assert.match(
    draftOrchestratorSource,
    /from\('inbox_ai_runs'\)\s*\.update\(\{[\s\S]*status: 'failed'[\s\S]*\}\)\s*\.eq\('tenant_id', input\.tenantId\)\s*\.eq\('id', input\.runId\)/,
  )
})
