const RESERVED_SLUGS = new Set([
  'www', 'admin', 'app', 'dashboard', 'api', 'status', 'mail', 'smtp', 'ftp',
  'styll', 'billing', 'login', 'signup', 'auth', 'help', 'support', 'blog', 'docs',
])

export interface SlugValidationResult {
  valid: boolean
  error?: string
}

export function validateSlug(slug: string): SlugValidationResult {
  if (slug.length < 3) return { valid: false, error: 'Minimum 3 characters' }
  if (slug.length > 30) return { valid: false, error: 'Maximum 30 characters' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, error: 'Only letters, numbers and hyphens' }
  if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, error: 'Cannot start or end with a hyphen' }
  if (slug.endsWith('-app') || slug.endsWith('-dashboard')) return { valid: false, error: 'Reserved by the system' }
  if (RESERVED_SLUGS.has(slug)) return { valid: false, error: 'This name is already used by Styll' }

  return { valid: true }
}
