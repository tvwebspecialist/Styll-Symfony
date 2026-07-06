import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildImportClientsResult,
  prepareClientImportPlan,
} from './client-import-core.ts'

test('skips duplicate existing clients and treats duplicate-only import as completed', () => {
  const plan = prepareClientImportPlan({
    tenantId: 'tenant-1',
    existingClients: [
      {
        id: 'client-1',
        full_name: 'Mario Rossi',
        email: 'mario@example.com',
        phone: '+39 333 123 4567',
        tags: ['vip'],
      },
    ],
    rows: [
      {
        Nome: 'Mario Rossi',
        Email: 'MARIO@example.com',
        Telefono: '0039 333 123 4567',
      },
    ],
    mapping: {
      Nome: 'full_name',
      Email: 'email',
      Telefono: 'phone',
    },
    duplicateStrategy: 'skip',
  })

  assert.equal(plan.toInsert.length, 0)
  assert.equal(plan.toUpdate.length, 0)
  assert.equal(plan.merged, 0)
  assert.equal(plan.skipped, 1)
  assert.equal(plan.errors.length, 0)

  const result = buildImportClientsResult({
    imported: 0,
    merged: plan.merged,
    skipped: plan.skipped,
    errors: plan.errors,
  })

  assert.equal(result.success, true)
  assert.equal(result.status, 'completed')
})

test('merges duplicates when email/phone match with similar formatting', () => {
  const plan = prepareClientImportPlan({
    tenantId: 'tenant-1',
    existingClients: [
      {
        id: 'client-1',
        full_name: 'Mario Rossi',
        email: 'mario@example.com',
        phone: '+39 333 123 4567',
        marketing_consent: false,
        tags: ['vip'],
      },
    ],
    rows: [
      {
        Nome: 'Mario Rossi Updated',
        Email: 'MARIO@EXAMPLE.COM',
        Telefono: '0039 333 123 4567',
        Tag: 'barba,newsletter',
        Marketing: 'yes',
      },
    ],
    mapping: {
      Nome: 'full_name',
      Email: 'email',
      Telefono: 'phone',
      Tag: 'tags',
      Marketing: 'marketing_consent',
    },
    duplicateStrategy: 'merge',
  })

  assert.equal(plan.toInsert.length, 0)
  assert.equal(plan.toUpdate.length, 1)
  assert.equal(plan.merged, 1)
  assert.equal(plan.skipped, 0)
  assert.deepEqual(plan.toUpdate[0], {
    id: 'client-1',
    patch: {
      full_name: 'Mario Rossi Updated',
      tags: JSON.stringify(['vip', 'barba', 'newsletter']),
      marketing_consent: true,
    },
  })
})

test('merges duplicate rows inside the same file into a single insert', () => {
  const plan = prepareClientImportPlan({
    tenantId: 'tenant-1',
    existingClients: [],
    rows: [
      {
        Nome: 'Giulia Bianchi',
        Email: 'giulia@example.com',
      },
      {
        Nome: 'Giulia Bianchi',
        Email: 'GIULIA@example.com',
        Telefono: '+39 333 222 1111',
        Tag: 'returning',
      },
    ],
    mapping: {
      Nome: 'full_name',
      Email: 'email',
      Telefono: 'phone',
      Tag: 'tags',
    },
    duplicateStrategy: 'merge',
  })

  assert.equal(plan.toInsert.length, 1)
  assert.equal(plan.toUpdate.length, 0)
  assert.equal(plan.merged, 1)
  assert.equal(plan.skipped, 0)
  assert.equal(plan.errors.length, 0)
  assert.deepEqual(plan.toInsert[0], {
    tenant_id: 'tenant-1',
    full_name: 'Giulia Bianchi',
    email: 'giulia@example.com',
    phone: '+393332221111',
    date_of_birth: null,
    marketing_consent: false,
    preferred_contact_channel: 'whatsapp',
    tags: JSON.stringify(['imported', 'returning']),
  })
})

test('handles 1000 valid rows without dropping inserts', () => {
  const rows = Array.from({ length: 1000 }, (_, index) => ({
    Nome: `Cliente ${index + 1}`,
    Email: `cliente.${index + 1}@example.com`,
    Telefono: `333000${String(index + 1).padStart(4, '0')}`,
  }))

  const plan = prepareClientImportPlan({
    tenantId: 'tenant-1',
    existingClients: [],
    rows,
    mapping: {
      Nome: 'full_name',
      Email: 'email',
      Telefono: 'phone',
    },
    duplicateStrategy: 'skip',
  })

  assert.equal(plan.toInsert.length, 1000)
  assert.equal(plan.toUpdate.length, 0)
  assert.equal(plan.merged, 0)
  assert.equal(plan.skipped, 0)
  assert.equal(plan.errors.length, 0)
})
