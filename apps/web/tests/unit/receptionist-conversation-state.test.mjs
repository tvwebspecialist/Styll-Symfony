import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'
import {
  buildReceptionistPreparedToolCall,
  inferWordBasedTimeForConversation,
  resolveDeterministicReceptionistConversationState,
  resolveReceptionistConversationState,
} from '../../src/lib/ai/receptionist-conversation-state.ts'

const AVAILABLE_RESULT = {
  available: true,
  requestedSlot: {
    date: '2026-07-21',
    startTime: '16:00',
    endTime: '16:30',
    staffIds: ['staff-1'],
  },
  suggestedSlots: [],
  reason: 'available',
}

const SERVICE_CATALOG = [
  {
    id: 'service-1',
    name: 'Taglio',
    price: 25,
    durationMinutes: 30,
  },
  {
    id: 'service-2',
    name: 'Barba',
    price: 15,
    durationMinutes: 20,
  },
]

function makeMessages(entries) {
  return entries.map((entry, index) => ({
    id: `message-${index + 1}`,
    author: entry.author ?? 'customer',
    text: entry.text,
    createdAt: entry.createdAt ?? `2026-07-20T09:${String(index).padStart(2, '0')}:00.000Z`,
    sourceRef: `message:message-${index + 1}`,
  }))
}

function makeInput(entries, understanding = null) {
  const messages = makeMessages(entries)
  const conversationMemory = resolveInboxConversationMemory({
    messages,
    serviceCatalog: SERVICE_CATALOG,
    timezone: 'Europe/Rome',
  })

  return {
    messages,
    serviceCatalog: SERVICE_CATALOG,
    timezone: 'Europe/Rome',
    conversationMemory,
    understanding,
  }
}

test('deterministic receptionist state keeps booking continuity and missing fields', () => {
  const input = makeInput([
    { text: 'Vorrei prenotare un taglio domani.' },
  ])

  const state = resolveDeterministicReceptionistConversationState(input)

  assert.equal(state.activeGoal, 'booking')
  assert.equal(state.service, 'Taglio')
  assert.equal(state.requestedDate, '2026-07-21')
  assert.equal(state.requestedTime, null)
  assert.deepEqual(state.missingFields, ['requestedTime'])
  assert.equal(state.nextQuestion, 'A che ora preferisci?')
})

test('hybrid receptionist state fills a missing time from provider understanding', () => {
  const input = makeInput([
    { text: 'Vorrei prenotare un taglio domani.' },
    { author: 'assistant', text: 'A che ora preferisci?' },
    { text: 'Alle quattro' },
  ], {
    intent: 'conversational_followup',
    confidence: 0.91,
    handoff: false,
    entities: {
      service: null,
      requestedDate: null,
      requestedTime: '16:00',
      appointmentReference: null,
      customerName: null,
      customerNotes: 'Alle quattro',
    },
    corrections: {
      replacesService: false,
      replacesDate: false,
      replacesTime: false,
    },
    citedSources: ['message:message-3'],
    requestedToolCalls: [],
  })

  const state = resolveReceptionistConversationState(input)

  assert.equal(state.requestedTime, '16:00')
  assert.deepEqual(state.missingFields, [])
  assert.equal(
    buildReceptionistPreparedToolCall(state, {
      availabilityResult: AVAILABLE_RESULT,
    })?.name,
    'prepare_booking_sandbox',
  )
})

test('hybrid receptionist state applies explicit corrections over previous service and time', () => {
  const input = makeInput([
    { text: 'Vorrei prenotare un taglio domani.' },
    { author: 'assistant', text: 'A che ora preferisci?' },
    { text: 'Anzi barba, alle 16.' },
  ], {
    intent: 'conversational_followup',
    confidence: 0.94,
    handoff: false,
    entities: {
      service: 'Barba',
      requestedDate: null,
      requestedTime: '16:00',
      appointmentReference: null,
      customerName: null,
      customerNotes: 'Anzi barba, alle 16.',
    },
    corrections: {
      replacesService: true,
      replacesDate: false,
      replacesTime: true,
    },
    citedSources: ['message:message-3'],
    requestedToolCalls: [],
  })

  const state = resolveReceptionistConversationState(input)

  assert.equal(state.service, 'Barba')
  assert.equal(state.requestedDate, '2026-07-21')
  assert.equal(state.requestedTime, '16:00')
})

test('hybrid receptionist state resolves a follow-up selecting the second suggested slot', () => {
  const input = makeInput([
    { text: 'Vorrei prenotare un taglio domani alle 16.' },
    { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
    { text: 'La seconda va bene' },
  ], {
    intent: 'conversational_followup',
    confidence: 0.92,
    handoff: false,
    entities: {
      service: null,
      requestedDate: null,
      requestedTime: null,
      appointmentReference: null,
      customerName: null,
      customerNotes: 'La seconda va bene',
    },
    corrections: {
      replacesService: false,
      replacesDate: false,
      replacesTime: false,
    },
    citedSources: ['message:message-3'],
    requestedToolCalls: [],
  })

  const state = resolveReceptionistConversationState(input)

  assert.equal(state.service, 'Taglio')
  assert.equal(state.requestedDate, '2026-07-21')
  assert.equal(state.requestedTime, '16:30')
})

test('hybrid receptionist state never lets an invalid provider service erase a valid known one', () => {
  const input = makeInput([
    { text: 'Quanto costa il taglio?' },
    { author: 'assistant', text: 'Il taglio costa 25 EUR.' },
    { text: 'Perfetto, vorrei prenotare domani alle 16.' },
  ], {
    intent: 'booking',
    confidence: 0.9,
    handoff: false,
    entities: {
      service: 'Colore',
      requestedDate: '2026-07-21',
      requestedTime: '16:00',
      appointmentReference: null,
      customerName: null,
      customerNotes: 'Perfetto, vorrei prenotare domani alle 16.',
    },
    corrections: {
      replacesService: false,
      replacesDate: false,
      replacesTime: false,
    },
    citedSources: ['message:message-3'],
    requestedToolCalls: [],
  })

  const state = resolveReceptionistConversationState(input)

  assert.equal(state.service, 'Taglio')
  assert.equal(state.requestedTime, '16:00')
})

test('hybrid receptionist state supports reschedule clarification and advisory tool preparation', () => {
  const input = makeInput([
    { text: 'Sono Marco, vorrei spostare l appuntamento di domani alle 15 a venerdi alle 17.' },
  ], {
    intent: 'reschedule',
    confidence: 0.93,
    handoff: false,
    entities: {
      service: null,
      requestedDate: '2026-07-24',
      requestedTime: '17:00',
      appointmentReference: 'appuntamento di domani alle 15',
      customerName: 'Marco',
      customerNotes: 'Sono Marco, vorrei spostare l appuntamento di domani alle 15 a venerdi alle 17.',
    },
    corrections: {
      replacesService: false,
      replacesDate: false,
      replacesTime: false,
    },
    citedSources: ['message:message-1'],
    requestedToolCalls: [],
  })

  const state = resolveReceptionistConversationState(input)
  const toolCall = buildReceptionistPreparedToolCall(state)

  assert.equal(state.activeGoal, 'reschedule')
  assert.deepEqual(state.missingFields, [])
  assert.equal(toolCall?.name, 'prepare_reschedule')
  assert.equal(toolCall?.arguments.current_appointment_reference, 'appuntamento di domani alle 15')
  assert.equal(toolCall?.arguments.customer_name, 'Marco')
})

test('inferWordBasedTimeForConversation normalizes common spoken times in booking context', () => {
  assert.equal(
    inferWordBasedTimeForConversation({
      text: 'Alle quattro',
      activeGoal: 'booking',
    }),
    '16:00',
  )
})
