import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveAvailabilityResult,
} from '../../src/lib/ai/availability-gateway.ts'
import {
  createDeterministicFakeAvailabilityGateway,
  deterministicFakeAvailabilityGateway,
} from '../../src/lib/ai/deterministic-fake-availability-gateway.ts'

test('resolveAvailabilityResult returns the requested slot when it exists', () => {
  const result = resolveAvailabilityResult({
    lookup: {
      serviceId: 'service-1',
      requestedDate: '2026-07-21',
      timezone: 'Europe/Rome',
      serviceAvailable: true,
      businessOpen: true,
      preferredTimeWithinBusinessHours: true,
      slots: [
        {
          date: '2026-07-21',
          startTime: '16:30',
          endTime: '17:00',
          staffIds: ['staff-1'],
        },
      ],
    },
    preferredTime: '16:30',
  })

  assert.equal(result.reason, 'available')
  assert.equal(result.available, true)
  assert.equal(result.requestedSlot?.startTime, '16:30')
  assert.deepEqual(result.suggestedSlots, [])
})

test('resolveAvailabilityResult keeps only three chronological suggestions nearest to the requested time', () => {
  const result = resolveAvailabilityResult({
    lookup: {
      serviceId: 'service-1',
      requestedDate: '2026-07-21',
      timezone: 'Europe/Rome',
      serviceAvailable: true,
      businessOpen: true,
      preferredTimeWithinBusinessHours: true,
      slots: [
        { date: '2026-07-21', startTime: '09:00', endTime: '09:30', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '15:30', endTime: '16:00', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '16:30', endTime: '17:00', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '17:00', endTime: '17:30', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '18:00', endTime: '18:30', staffIds: ['staff-1'] },
      ],
    },
    preferredTime: '16:00',
  })

  assert.equal(result.reason, 'slot_unavailable')
  assert.deepEqual(
    result.suggestedSlots.map((slot) => slot.startTime),
    ['15:30', '16:30', '17:00'],
  )
})

test('resolveAvailabilityResult distinguishes business closed from slot unavailable', () => {
  const result = resolveAvailabilityResult({
    lookup: {
      serviceId: 'service-1',
      requestedDate: '2026-07-21',
      timezone: 'Europe/Rome',
      serviceAvailable: true,
      businessOpen: true,
      preferredTimeWithinBusinessHours: false,
      slots: [
        { date: '2026-07-21', startTime: '15:30', endTime: '16:00', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '16:30', endTime: '17:00', staffIds: ['staff-1'] },
        { date: '2026-07-21', startTime: '17:00', endTime: '17:30', staffIds: ['staff-1'] },
      ],
    },
    preferredTime: '22:00',
  })

  assert.equal(result.reason, 'business_closed')
  assert.equal(result.available, false)
  assert.deepEqual(
    result.suggestedSlots.map((slot) => slot.startTime),
    ['15:30', '16:30', '17:00'],
  )
})

test('deterministic fake gateway returns the documented Barber House suggestions for Tuesday, July 21, 2026 at 16:00', async () => {
  const lookup = await deterministicFakeAvailabilityGateway.findAvailableSlots({
    tenantId: 'barber-house',
    serviceId: 'service-1',
    requestedDate: '2026-07-21',
    preferredTime: '16:00',
  })
  const result = resolveAvailabilityResult({
    lookup,
    preferredTime: '16:00',
  })

  assert.equal(result.reason, 'slot_unavailable')
  assert.deepEqual(
    result.suggestedSlots.map((slot) => slot.startTime),
    ['15:30', '16:30', '17:00'],
  )
})

test('deterministic fake gateway marks 22:00 as business closed on Tuesday, July 21, 2026', async () => {
  const lookup = await deterministicFakeAvailabilityGateway.findAvailableSlots({
    tenantId: 'barber-house',
    serviceId: 'service-1',
    requestedDate: '2026-07-21',
    preferredTime: '22:00',
  })
  const result = resolveAvailabilityResult({
    lookup,
    preferredTime: '22:00',
  })

  assert.equal(lookup.preferredTimeWithinBusinessHours, false)
  assert.equal(result.reason, 'business_closed')
})

test('deterministic fake gateway keeps a multi-staff tenant available at 16:00 when another barber can take the slot', async () => {
  const lookup = await deterministicFakeAvailabilityGateway.findAvailableSlots({
    tenantId: 'tenant-a',
    serviceId: 'service-1',
    requestedDate: '2026-07-21',
    preferredTime: '16:00',
  })
  const result = resolveAvailabilityResult({
    lookup,
    preferredTime: '16:00',
  })

  assert.equal(result.reason, 'available')
  assert.equal(result.requestedSlot?.startTime, '16:00')
  assert.deepEqual(result.requestedSlot?.staffIds, ['staff-2'])
})

test('custom fake gateway can represent a full day with no available suggestions', async () => {
  const gateway = createDeterministicFakeAvailabilityGateway({
    'barber-house': {
      timezone: 'Europe/Rome',
      serviceDurations: {
        'service-1': 30,
      },
      staff: [
        {
          id: 'staff-1',
          serviceIds: ['service-1'],
          weeklyHours: {
            2: [{ startTime: '09:00', endTime: '10:00' }],
          },
          busyByDate: {
            '2026-07-21': [
              { startTime: '09:00', endTime: '10:00' },
            ],
          },
        },
      ],
    },
  })

  const lookup = await gateway.findAvailableSlots({
    tenantId: 'barber-house',
    serviceId: 'service-1',
    requestedDate: '2026-07-21',
    preferredTime: '09:30',
  })
  const result = resolveAvailabilityResult({
    lookup,
    preferredTime: '09:30',
  })

  assert.equal(result.reason, 'slot_unavailable')
  assert.deepEqual(result.suggestedSlots, [])
})
