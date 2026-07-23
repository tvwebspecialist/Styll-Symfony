import type { AvailabilityGateway } from './availability-gateway.ts'
import { deterministicFakeAvailabilityGateway } from './deterministic-fake-availability-gateway.ts'
import { currentAvailabilityGateway } from './current-availability-gateway.ts'

type InboxAvailabilityGatewayMode = 'fake' | 'current'

function normalizeInboxAvailabilityGatewayMode(
  value: string | undefined,
): InboxAvailabilityGatewayMode {
  switch (value?.trim().toLowerCase()) {
    case 'fake':
      return 'fake'
    case 'current':
    case undefined:
    case '':
      return 'current'
    default:
      return 'current'
  }
}

export function resolveConfiguredInboxAvailabilityGateway(
  env: Record<string, string | undefined> = process.env,
): AvailabilityGateway {
  const mode = normalizeInboxAvailabilityGatewayMode(env.INBOX_AVAILABILITY_GATEWAY)
  return mode === 'fake'
    ? deterministicFakeAvailabilityGateway
    : currentAvailabilityGateway
}
