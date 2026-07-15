export interface ExistingPushEndpointClaim {
  profileId: string | null
}

export type PushEndpointClaimStatus =
  | 'unclaimed'
  | 'owned_by_request_user'
  | 'owned_by_other_user'

export function classifyPushEndpointClaim(
  existing: ExistingPushEndpointClaim | null,
  requestUserId: string,
): PushEndpointClaimStatus {
  if (!existing) return 'unclaimed'
  if (existing.profileId === requestUserId) return 'owned_by_request_user'
  return 'owned_by_other_user'
}
