import test from 'node:test'
import assert from 'node:assert/strict'

import {
  approveInboxDraftApproval,
  createInboxDraftApprovalState,
  discardInboxDraftApproval,
  editInboxDraftApprovalText,
} from '../../src/lib/ai/inbox-draft-approval-core.ts'

function makeDraft() {
  return {
    text: 'Bozza iniziale',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v3',
    providerLabel: 'AI bozza locale',
    sources: [
      {
        kind: 'conversation',
        label: 'Conversation message (customer)',
      },
    ],
    decision: {
      kind: 'draft_review',
      reasonCode: 'draft_only_mode',
      reasonSummary: 'Questo tenant e in modalita draft-only: la bozza resta sempre sotto revisione umana.',
      handoffRecommended: false,
      appointmentPreparation: null,
    },
  }
}

test('draft approval state can be created and edited locally before approval', () => {
  const initialState = createInboxDraftApprovalState(makeDraft())
  const editedState = editInboxDraftApprovalText(initialState, 'Bozza modificata')

  assert.equal(initialState.text, 'Bozza iniziale')
  assert.equal(editedState.text, 'Bozza modificata')
  assert.equal(editedState.promptVersion, '2026-07-20.v3')
  assert.equal(editedState.decision.kind, 'draft_review')
})

test('approving a draft only moves text into the manual composer and clears the local draft', () => {
  const state = createInboxDraftApprovalState(makeDraft())
  const approved = approveInboxDraftApproval(state)

  assert.equal(approved.composerText, 'Bozza iniziale')
  assert.equal(approved.nextDraft, null)
})

test('discarding a draft clears local approval state without sending anything', () => {
  assert.equal(discardInboxDraftApproval(), null)
})
