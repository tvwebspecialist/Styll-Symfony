export function toPublicErrorMessage(
  error: unknown,
  fallback: string,
  preserveIf?: (message: string) => boolean,
): string {
  const message = error instanceof Error ? error.message.trim() : ''

  if (message && preserveIf?.(message)) {
    return message
  }

  return fallback
}
