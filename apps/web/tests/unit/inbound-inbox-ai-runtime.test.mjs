import test from 'node:test'
import assert from 'node:assert/strict'

import {
  processClaimedInboundAiRunCore,
} from '../../src/lib/ai/inbound-inbox-ai-runtime.ts'
import { InboxDraftProviderSelectionError } from '../../src/lib/ai/inbox-draft-provider-selection.ts'

function makeQueuedRun(overrides = {}) {
  return {
    id: 'run-1',
    tenant_id: 'tenant-a',
    conversation_id: 'conversation-1',
    message_id: 'message-1',
    provider_id: 'anthropic_claude_sonnet_5_draft_v1',
    prompt_id: 'whatsapp_inbox_draft_only',
    prompt_version: '2026-07-20.v6',
    status: 'started',
    ...overrides,
  }
}

function makePreparedRequest(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v6',
    systemPrompt: 'draft only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Ciao',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
    ],
    contextSections: [],
    sources: [],
    allowedTools: [],
    conversationState: {
      status: 'ai_active',
      ownershipMode: 'hybrid',
      aiPausedAt: null,
      clientId: 'client-1',
    },
    tenantProfile: {
      businessName: 'Barber House',
      timezone: 'Europe/Rome',
    },
    receptionistConfig: {
      mode: 'supervised',
      autoReplyConfidenceThreshold: 0.9,
      handoffConfidenceThreshold: 0.65,
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
      preferredTone: 'professionale',
      greetingStyle: 'saluto breve',
      escalationInstructions: null,
      customFaqs: [],
    },
    serviceCatalog: [],
    customFaqCatalog: [],
    conversationMemory: {
      latestIntent: 'greeting',
      activeIntent: null,
      lastService: null,
      lastDate: null,
      lastTime: null,
      lastMissingSlot: null,
      planner: null,
    },
    ...overrides,
  }
}

function makeDeps(overrides = {}) {
  const calls = {
    loadDraftRequest: 0,
    resolveProvider: 0,
    updateRunTerminalState: [],
    runDraft: 0,
  }

  const deps = {
    async loadDraftRequest() {
      calls.loadDraftRequest += 1
      return makePreparedRequest()
    },
    resolveProvider() {
      calls.resolveProvider += 1
      return {
        providerId: 'anthropic_claude_sonnet_5_draft_v1',
      }
    },
    async updateRunTerminalState(input) {
      calls.updateRunTerminalState.push(input)
    },
    async runDraft() {
      calls.runDraft += 1
    },
    ...overrides,
  }

  return { deps, calls }
}

test('claimed inbound AI run is skipped before provider invocation when the conversation is human-owned', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      calls.loadDraftRequest += 1
      return makePreparedRequest({
        conversationState: {
          status: 'human_active',
          ownershipMode: 'human',
          aiPausedAt: '2026-07-20T09:30:00.000Z',
          clientId: 'client-1',
        },
      })
    },
  })

  const outcome = await processClaimedInboundAiRunCore(makeQueuedRun(), deps)

  assert.equal(outcome, 'skipped')
  assert.equal(calls.resolveProvider, 0)
  assert.equal(calls.runDraft, 0)
  assert.equal(calls.updateRunTerminalState[0]?.reasonCode, 'human_control_active')
})

test('claimed inbound AI run is skipped when AI is paused for the conversation', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      calls.loadDraftRequest += 1
      return makePreparedRequest({
        conversationState: {
          status: 'ai_paused',
          ownershipMode: 'hybrid',
          aiPausedAt: '2026-07-20T09:30:00.000Z',
          clientId: 'client-1',
        },
      })
    },
  })

  const outcome = await processClaimedInboundAiRunCore(makeQueuedRun(), deps)

  assert.equal(outcome, 'skipped')
  assert.equal(calls.resolveProvider, 0)
  assert.equal(calls.runDraft, 0)
  assert.equal(calls.updateRunTerminalState[0]?.reasonCode, 'ai_paused')
})

test('claimed inbound AI run is blocked when the tenant disables the receptionist', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      calls.loadDraftRequest += 1
      return makePreparedRequest({
        receptionistConfig: {
          ...makePreparedRequest().receptionistConfig,
          mode: 'disabled',
        },
      })
    },
  })

  const outcome = await processClaimedInboundAiRunCore(makeQueuedRun(), deps)

  assert.equal(outcome, 'blocked')
  assert.equal(calls.resolveProvider, 0)
  assert.equal(calls.runDraft, 0)
  assert.equal(calls.updateRunTerminalState[0]?.reasonCode, 'tenant_mode_disabled')
})

test('claimed inbound AI run fails safely when the configured provider is unavailable', async () => {
  const { deps, calls } = makeDeps({
    resolveProvider() {
      calls.resolveProvider += 1
      throw new InboxDraftProviderSelectionError('ANTHROPIC_API_KEY missing')
    },
  })

  const outcome = await processClaimedInboundAiRunCore(makeQueuedRun(), deps)

  assert.equal(outcome, 'failed')
  assert.equal(calls.resolveProvider, 1)
  assert.equal(calls.runDraft, 0)
  assert.equal(calls.updateRunTerminalState[0]?.reasonCode, 'provider_not_configured')
})

test('claimed inbound AI run reaches the provider path only after all safety gates pass', async () => {
  const { deps, calls } = makeDeps()

  const outcome = await processClaimedInboundAiRunCore(makeQueuedRun(), deps)

  assert.equal(outcome, 'completed')
  assert.equal(calls.resolveProvider, 1)
  assert.equal(calls.runDraft, 1)
  assert.equal(calls.updateRunTerminalState.length, 0)
})
