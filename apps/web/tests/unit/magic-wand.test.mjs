import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MagicWandRequestSchema,
  buildMagicWandPrompt,
} from '../../src/lib/ai/magic-wand.ts'

const validRequest = {
  field: 'tagline',
  context: {
    business_name: 'Barber Test',
    city: 'Roma',
    services: ['Taglio', 'Barba'],
    staff_count: 2,
  },
}

test('MagicWandRequestSchema accepts a bounded valid payload', () => {
  const parsed = MagicWandRequestSchema.safeParse(validRequest)
  assert.equal(parsed.success, true)
})

test('MagicWandRequestSchema rejects invalid fields and oversized service lists', () => {
  const invalidField = MagicWandRequestSchema.safeParse({
    ...validRequest,
    field: 'unknown',
  })
  assert.equal(invalidField.success, false)

  const tooManyServices = MagicWandRequestSchema.safeParse({
    ...validRequest,
    context: {
      ...validRequest.context,
      services: Array.from({ length: 21 }, (_, index) => `Servizio ${index}`),
    },
  })
  assert.equal(tooManyServices.success, false)
})

test('buildMagicWandPrompt always returns a concrete prompt for valid fields', () => {
  assert.match(buildMagicWandPrompt('tagline', validRequest.context), /Genera 3 tagline/)
  assert.match(buildMagicWandPrompt('team_description', validRequest.context), /Scrivi un sottotitolo breve/)
})
