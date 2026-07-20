import test from 'node:test'
import assert from 'node:assert/strict'

import {
  InboxDraftPreparationError,
  buildInboxDraftRequest,
  compareInboxDraftMessages,
  sanitizeDraftContextText,
  selectInboxDraftMessageWindow,
} from '../../src/lib/ai/inbox-draft-context-core.ts'
import { getToolPolicy } from '../../src/lib/messaging/policy.ts'

function makeInput(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    conversation: {
      id: 'conversation-1',
      tenantId: 'tenant-a',
      status: 'ai_draft_only',
      ownershipMode: 'hybrid',
      aiPausedAt: null,
      clientId: 'client-1',
    },
    tenant: {
      id: 'tenant-a',
      businessName: 'Barber House',
      tagline: 'Tagli puliti e barba precisa',
      description: 'Specialisti in taglio uomo e rasatura tradizionale.',
      timezone: 'Europe/Rome',
      receptionistConfig: {
        mode: 'draft_only',
        autoReplyConfidenceThreshold: 0.9,
        handoffConfidenceThreshold: 0.65,
        allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours'],
        preferredTone: 'caldo e professionale',
        greetingStyle: 'saluto breve',
        escalationInstructions: 'coinvolgi lo staff se il cliente e agitato',
      },
    },
    services: [
      {
        id: 'service-2',
        name: 'Barba',
        description: 'Rifinitura completa',
        price: 15,
        durationMinutes: 20,
        displayOrder: 2,
      },
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Consulenza inclusa',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
    ],
    workingHours: [
      {
        id: 'wh-2',
        dayOfWeek: 1,
        startTime: '14:00:00',
        endTime: '18:00:00',
      },
      {
        id: 'wh-1',
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '13:00:00',
      },
    ],
    messages: [
      {
        id: 'message-1',
        authorKind: 'customer',
        bodyText: '  Ciao, il mio numero e 333 111 2222 \n avete posto domani? ',
        createdAt: '2026-07-20T09:00:00.000Z',
      },
      {
        id: 'message-2',
        authorKind: 'human',
        bodyText: 'Scrivimi a luca@example.com appena sai qualcosa.',
        createdAt: '2026-07-20T09:01:00.000Z',
      },
    ],
    ...overrides,
  }
}

test('sanitizeDraftContextText trims whitespace and redacts phone and email', () => {
  assert.equal(
    sanitizeDraftContextText('  scrivi a luca@example.com o al +39 333 111 2222 \n grazie  ', 120),
    'scrivi a [redacted email] o al [redacted phone] grazie',
  )
})

test('buildInboxDraftRequest prepares a versioned draft-only payload with traced sources', () => {
  const draftRequest = buildInboxDraftRequest(makeInput())

  assert.equal(draftRequest.promptId, 'whatsapp_inbox_draft_only')
  assert.equal(draftRequest.promptVersion, '2026-07-20.v3')
  assert.equal(draftRequest.messages.length, 2)
  assert.equal(draftRequest.messages[0].sourceRef, 'message:message-1')
  assert.equal(draftRequest.messages[0].text.includes('[redacted phone]'), true)
  assert.equal(draftRequest.messages[1].text.includes('[redacted email]'), true)
  assert.equal(draftRequest.conversationState.clientId, 'client-1')
  assert.equal(draftRequest.receptionistConfig.preferredTone, 'caldo e professionale')
  assert.deepEqual(
    draftRequest.contextSections.map((section) => section.key),
    ['conversation_state', 'tenant_profile', 'services', 'working_hours', 'tool_policies'],
  )
  assert.ok(
    draftRequest.sources.some((source) => source.ref === 'service:service-1'),
  )
  assert.ok(
    draftRequest.sources.some((source) => source.ref === 'working_hours:wh-1'),
  )
  assert.ok(
    draftRequest.allowedTools.includes('confirm_appointment'),
  )
  assert.ok(
    !draftRequest.allowedTools.includes('refund'),
  )

  const servicesSection = draftRequest.contextSections.find((section) => section.key === 'services')
  assert.match(servicesSection.text, /Taglio \| EUR 25 \| 30 min/)
  assert.match(servicesSection.text, /Barba \| EUR 15 \| 20 min/)

  const tenantProfileSection = draftRequest.contextSections.find((section) => section.key === 'tenant_profile')
  assert.match(tenantProfileSection.text, /preferred_tone=caldo e professionale/)
  assert.match(tenantProfileSection.text, /greeting_style=saluto breve/)
  assert.match(tenantProfileSection.text, /escalation_instructions=coinvolgi lo staff se il cliente e agitato/)

  const workingHoursSection = draftRequest.contextSections.find(
    (section) => section.key === 'working_hours',
  )
  assert.match(workingHoursSection.text, /lunedi: 09:00:00-13:00:00, 14:00:00-18:00:00/)

  const conversationStateSection = draftRequest.contextSections.find(
    (section) => section.key === 'conversation_state',
  )
  assert.match(conversationStateSection.text, /known_customer=true/)
})

test('buildInboxDraftRequest keeps only the latest prompt-sized conversation window', () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    id: `message-${index + 1}`,
    authorKind: index % 2 === 0 ? 'customer' : 'human',
    bodyText: `Messaggio ${index + 1}`,
    createdAt: `2026-07-20T${String(9 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00.000Z`,
  }))

  const draftRequest = buildInboxDraftRequest(makeInput({ messages }))

  assert.equal(draftRequest.messages.length, 8)
  assert.deepEqual(
    draftRequest.messages.map((message) => message.id),
    [
      'message-33',
      'message-34',
      'message-35',
      'message-36',
      'message-37',
      'message-38',
      'message-39',
      'message-40',
    ],
  )
  assert.equal(
    draftRequest.messages.some((message) => message.id === 'message-1'),
    false,
  )
})

test('selectInboxDraftMessageWindow and compareInboxDraftMessages stay deterministic on equal timestamps', () => {
  const messages = [
    {
      id: 'message-a',
      authorKind: 'customer',
      bodyText: 'Uno',
      createdAt: '2026-07-20T09:00:00.000Z',
    },
    {
      id: 'message-c',
      authorKind: 'customer',
      bodyText: 'Tre',
      createdAt: '2026-07-20T09:00:00.000Z',
    },
    {
      id: 'message-b',
      authorKind: 'customer',
      bodyText: 'Due',
      createdAt: '2026-07-20T09:00:00.000Z',
    },
  ]

  assert.deepEqual(
    [...messages].sort(compareInboxDraftMessages).map((message) => message.id),
    ['message-a', 'message-b', 'message-c'],
  )

  assert.deepEqual(
    selectInboxDraftMessageWindow(messages).map((message) => message.id),
    ['message-a', 'message-b', 'message-c'],
  )
})

test('buildInboxDraftRequest keeps source refs unique and limited to included context', () => {
  const draftRequest = buildInboxDraftRequest(makeInput({
    services: [
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Consulenza inclusa',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Consulenza inclusa',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
    ],
  }))

  const sourceRefs = draftRequest.sources.map((source) => source.ref)
  assert.equal(new Set(sourceRefs).size, sourceRefs.length)

  const servicesSection = draftRequest.contextSections.find((section) => section.key === 'services')
  assert.deepEqual(servicesSection.sourceRefs, ['service:service-1'])
  assert.equal(
    sourceRefs.includes('message:message-1'),
    true,
  )
  assert.equal(
    sourceRefs.includes('message:message-999'),
    false,
  )
})

test('buildInboxDraftRequest keeps all non-deny tools available for advisory-only drafting', () => {
  const draftRequest = buildInboxDraftRequest(makeInput())

  for (const toolName of draftRequest.allowedTools) {
    assert.notEqual(getToolPolicy(toolName), 'deny_ai')
  }

  assert.ok(draftRequest.allowedTools.includes('prepare_appointment'))
  assert.ok(draftRequest.allowedTools.includes('confirm_appointment'))
  assert.ok(draftRequest.allowedTools.includes('add_internal_note'))
})

test('buildInboxDraftRequest rejects cross-tenant resources', () => {
  assert.throws(
    () => buildInboxDraftRequest(makeInput({
      conversation: {
        id: 'conversation-1',
        tenantId: 'tenant-b',
        status: 'ai_draft_only',
        ownershipMode: 'hybrid',
        aiPausedAt: null,
        clientId: 'client-1',
      },
    })),
    (error) =>
      error instanceof InboxDraftPreparationError
      && error.code === 'CROSS_TENANT_RESOURCE',
  )
})
