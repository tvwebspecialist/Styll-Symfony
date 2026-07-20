import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateInboxDraftCore,
  InboxDraftRuntimeError,
} from '../../src/lib/ai/inbox-draft-orchestrator-core.ts'
import { InboxDraftPreparationError } from '../../src/lib/ai/inbox-draft-context-core.ts'

function makeDraftRequest() {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v3',
    systemPrompt: 'draft only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Vorrei prenotare un taglio domani pomeriggio.',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
    ],
    contextSections: [
      {
        key: 'tenant_profile',
        title: 'Tenant profile',
        text: 'business_name=Barber House\ntimezone=Europe/Rome',
        sourceRefs: ['tenant:tenant-a:profile'],
      },
    ],
    sources: [
      {
        kind: 'conversation',
        label: 'Conversation message (customer)',
        ref: 'message:message-1',
      },
      {
        kind: 'knowledge',
        label: 'Tenant profile',
        ref: 'tenant:tenant-a:profile',
      },
      {
        kind: 'knowledge',
        label: 'Working hours: lunedi',
        ref: 'working_hours:wh-1',
      },
    ],
    allowedTools: ['prepare_appointment', 'confirm_appointment', 'request_human_handoff'],
    conversationState: {
      status: 'ai_draft_only',
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
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours'],
      preferredTone: 'professionale',
      greetingStyle: null,
      escalationInstructions: null,
    },
    serviceCatalog: [
      {
        id: 'service-1',
        name: 'Taglio',
        price: 25,
        durationMinutes: 30,
      },
    ],
  }
}

function makeDeps(overrides = {}) {
  const calls = {
    createRun: 0,
    completeRun: 0,
    failRun: 0,
    provider: 0,
    lastCompleteRunInput: null,
  }

  const deps = {
    async loadDraftRequest() {
      return makeDraftRequest()
    },
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: 'Ciao, posso preparare una proposta di appuntamento da far verificare allo staff.',
          confidence: 0.87,
          intent: 'appointment_booking',
          handoff: false,
          internalReasoning: 'Richiesta di prenotazione con risposta conservativa.',
          citedSources: ['message:message-1', 'working_hours:wh-1'],
          requestedToolCalls: [
            {
              name: 'prepare_appointment',
              arguments: {
                source: 'draft_only_advisory',
              },
            },
          ],
          providerRunId: 'local-run-1',
        }
      },
    },
    async createRun() {
      calls.createRun += 1
      return { runId: 'run-1' }
    },
    async completeRun(input) {
      calls.completeRun += 1
      calls.lastCompleteRunInput = input
    },
    async failRun() {
      calls.failRun += 1
    },
    ...overrides,
  }

  return { deps, calls }
}

test('generateInboxDraftCore creates a persisted draft-only run and preserves source attribution', async () => {
  const { deps, calls } = makeDeps()

  const result = await generateInboxDraftCore(
    {
      tenantId: 'tenant-a',
      conversationId: 'conversation-1',
    },
    deps,
  )

  assert.equal(result.runId, 'run-1')
  assert.equal(result.providerId, 'deterministic_fake_draft_v1')
  assert.equal(result.promptVersion, '2026-07-20.v3')
  assert.equal(result.intent, 'appointment_booking')
  assert.equal(result.handoff, false)
  assert.equal(result.confidence, 0.87)
  assert.equal(result.internalReasoning, 'Richiesta di prenotazione con risposta conservativa.')
  assert.equal(result.citedSources.map((source) => source.ref).join(','), 'message:message-1,working_hours:wh-1')
  assert.equal(result.requestedToolCalls[0].name, 'prepare_appointment')
  assert.equal(result.requestedToolCalls[0].policy, 'allow')
  assert.equal(result.decision.kind, 'action_prepare_candidate')
  assert.equal(result.decision.reasonCode, 'action_ready')
  assert.equal(result.decision.appointmentPreparation?.eligible, true)
  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 1)
  assert.equal(calls.failRun, 0)
  assert.equal(calls.provider, 1)
  assert.equal(calls.lastCompleteRunInput?.handoffReason, null)
})

test('generateInboxDraftCore rejects cross-tenant draft loads before creating a run', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      throw new InboxDraftPreparationError(
        'CROSS_TENANT_RESOURCE',
        'cross tenant',
        404,
      )
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'CROSS_TENANT_RESOURCE',
  )

  assert.equal(calls.createRun, 0)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 0)
})

test('generateInboxDraftCore marks the run failed when the provider throws', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        throw new Error('provider failed')
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'PROVIDER_FAILED',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
})

test('generateInboxDraftCore rejects malformed provider output and never auto-executes requested tools', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: '   ',
          confidence: 0.5,
          intent: 'unknown',
          handoff: true,
          internalReasoning: 'Risposta malformata.',
          citedSources: ['external:unknown'],
          requestedToolCalls: [
            {
              name: 'refund',
              arguments: {
                amount: 10,
              },
            },
          ],
          providerRunId: 'bad-run',
        }
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'MALFORMED_PROVIDER_RESPONSE',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
})

test('generateInboxDraftCore rejects provider responses with invalid structured intent metadata', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'anthropic_claude_sonnet_5_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: 'Ciao',
          confidence: 1.2,
          intent: 'non_existing_intent',
          handoff: false,
          internalReasoning: 'metadata invalid',
          citedSources: ['message:message-1'],
          requestedToolCalls: [],
          providerRunId: 'anthropic-run-1',
        }
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'MALFORMED_PROVIDER_RESPONSE',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
})
