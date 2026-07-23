import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'

const SERVICE_CATALOG = [
  { id: 'service-1', name: 'Taglio', price: 25, durationMinutes: 30 },
  { id: 'service-2', name: 'Barba', price: 15, durationMinutes: 20 },
]

function makeMessages(entries) {
  return entries.map((entry, index) => ({
    id: `message-${index + 1}`,
    author: entry.author,
    text: entry.text,
    createdAt: entry.createdAt ?? `2026-07-20T09:${String(index).padStart(2, '0')}:00.000Z`,
    sourceRef: `message:message-${index + 1}`,
  }))
}

function resolveMemory(entries) {
  return resolveInboxConversationMemory({
    messages: makeMessages(entries),
    serviceCatalog: SERVICE_CATALOG,
    timezone: 'Europe/Rome',
  })
}

test('conversation memory keeps the service chosen during pricing and reuses it in a later booking request', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Quanto costa il taglio?' },
    { author: 'assistant', text: 'Il taglio costa 25EUR.' },
    { author: 'customer', text: 'Perfetto, allora vorrei prenotare domani alle 16.' },
  ])

  assert.equal(memory.latestIntent, 'booking')
  assert.equal(memory.activeIntent, 'booking')
  assert.equal(memory.lastService?.name, 'Taglio')
  assert.equal(memory.lastDate?.isoDate, '2026-07-21')
  assert.equal(memory.lastTime?.normalizedTime, '16:00')
  assert.equal(memory.planner?.state, 'appointment_complete')
})

test('conversation memory keeps the planner on the next missing slot after a vague booking request', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Vorrei prenotare un taglio domani pomeriggio.' },
  ])

  assert.equal(memory.planner?.state, 'appointment_missing_time')
  assert.equal(memory.lastMissingSlot, 'requested_time')
  assert.equal(memory.planner?.nextQuestion, 'Perfetto, nel pomeriggio a che ora preferisci?')
})

test('conversation memory fills the missing time slot from a short follow-up like "alle 16"', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Vorrei prenotare un taglio domani.' },
    { author: 'assistant', text: 'A che ora preferisci?' },
    { author: 'customer', text: 'Alle 16' },
  ])

  assert.equal(memory.latestIntent, 'conversational_followup')
  assert.equal(memory.planner?.state, 'appointment_complete')
  assert.equal(memory.lastTime?.normalizedTime, '16:00')
  assert.equal(memory.planner?.preparedToolCall?.arguments.requested_time, '16:00')
})

test('conversation memory accepts standalone time follow-ups like "16"', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Vorrei prenotare un taglio domani.' },
    { author: 'assistant', text: 'A che ora preferisci?' },
    { author: 'customer', text: '16' },
  ])

  assert.equal(memory.latestIntent, 'conversational_followup')
  assert.equal(memory.lastTime?.normalizedTime, '16:00')
  assert.equal(memory.planner?.state, 'appointment_complete')
})

test('conversation memory updates the service when the customer changes their mind mid-booking', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Vorrei prenotare un taglio domani.' },
    { author: 'assistant', text: 'Perfetto, a che ora preferisci?' },
    { author: 'customer', text: 'Anzi barba, alle 16.' },
  ])

  assert.equal(memory.lastService?.name, 'Barba')
  assert.equal(memory.lastTime?.normalizedTime, '16:00')
  assert.equal(memory.planner?.preparedToolCall?.arguments.service, 'Barba')
})

test('conversation memory prepares a complete appointment payload with notes and summary', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Ciao' },
    { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
    { author: 'customer', text: 'Se possibile preferisco puntuale, grazie.' },
  ])

  assert.equal(memory.planner?.preparedToolCall?.name, 'prepare_appointment')
  assert.equal(memory.planner?.preparedToolCall?.arguments.requested_date, '2026-07-21')
  assert.equal(memory.planner?.preparedToolCall?.arguments.requested_time, '16:00')
  assert.match(memory.planner?.preparedToolCall?.arguments.customer_notes ?? '', /taglio domani alle 16/i)
  assert.match(memory.planner?.preparedToolCall?.arguments.conversation_summary ?? '', /2026-07-21/)
})

test('conversation memory keeps current appointment reference separate from the new reschedule target', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Possiamo spostare l appuntamento di domani alle 15 a venerdi alle 17?' },
  ])

  assert.equal(memory.latestIntent, 'reschedule')
  assert.equal(memory.activeIntent, 'reschedule')
  assert.equal(memory.lastAppointmentReference, 'appuntamento di domani alle 15')
  assert.equal(memory.lastDate?.isoDate, '2026-07-24')
  assert.equal(memory.lastTime?.normalizedTime, '17:00')
})

test('conversation memory does not reuse the current appointment time when a reschedule target time is missing', () => {
  const memory = resolveMemory([
    { author: 'customer', text: 'Vorrei spostare l appuntamento di domani alle 15 a venerdi.' },
  ])

  assert.equal(memory.latestIntent, 'reschedule')
  assert.equal(memory.lastAppointmentReference, 'appuntamento di domani alle 15')
  assert.equal(memory.lastDate?.isoDate, '2026-07-24')
  assert.equal(memory.lastTime, null)
})
