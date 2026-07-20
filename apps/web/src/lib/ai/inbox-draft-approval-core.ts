import type { PublicInboxDraftResult } from './inbox-draft-orchestrator'

export interface InboxDraftApprovalState {
  promptId: string
  promptVersion: string
  providerLabel: string
  sources: PublicInboxDraftResult['sources']
  decision: PublicInboxDraftResult['decision']
  text: string
}

export function createInboxDraftApprovalState(
  draft: PublicInboxDraftResult,
): InboxDraftApprovalState {
  return {
    promptId: draft.promptId,
    promptVersion: draft.promptVersion,
    providerLabel: draft.providerLabel,
    sources: draft.sources,
    decision: draft.decision,
    text: draft.text,
  }
}

export function editInboxDraftApprovalText(
  state: InboxDraftApprovalState,
  text: string,
): InboxDraftApprovalState {
  return {
    ...state,
    text,
  }
}

export function approveInboxDraftApproval(
  state: InboxDraftApprovalState,
): {
  composerText: string
  nextDraft: null
} {
  return {
    composerText: state.text.trim(),
    nextDraft: null,
  }
}

export function discardInboxDraftApproval(): null {
  return null
}
