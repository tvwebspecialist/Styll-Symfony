export const PWA_PREVIEW_PARAMS = {
  enabled: 'preview',
  businessName: 'preview_business_name',
  primaryColor: 'preview_primary_color',
  logoUrl: 'preview_logo_url',
  fontFamily: 'preview_font_family',
} as const

const ALLOWED_FONT_FAMILIES = new Set([
  'outfit',
  'inter',
  'poppins',
  'playfair',
  'montserrat',
])

type SearchParamsLike =
  | URLSearchParams
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>

function readParam(source: SearchParamsLike, key: string): string | null {
  if ('get' in source && typeof source.get === 'function') {
    return source.get(key)
  }

  const value = (source as Record<string, string | string[] | undefined>)[key]
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function sanitizeHexColor(value: string | null): string | null {
  const normalized = value?.trim() ?? ''
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return null
  }

  return normalized
}

function sanitizeFontFamily(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (!ALLOWED_FONT_FAMILIES.has(normalized)) {
    return null
  }

  return normalized
}

function sanitizeString(value: string | null): string | null {
  const normalized = value?.trim() ?? ''
  return normalized ? normalized : null
}

export interface PwaPreviewConfig {
  enabled: boolean
  businessName: string | null
  primaryColor: string | null
  logoUrl: string | null
  fontFamily: string | null
}

export function readPwaPreviewConfig(source: SearchParamsLike): PwaPreviewConfig {
  const enabled = readParam(source, PWA_PREVIEW_PARAMS.enabled) === 'true'

  return {
    enabled,
    businessName: enabled
      ? sanitizeString(readParam(source, PWA_PREVIEW_PARAMS.businessName))
      : null,
    primaryColor: enabled
      ? sanitizeHexColor(readParam(source, PWA_PREVIEW_PARAMS.primaryColor))
      : null,
    logoUrl: enabled
      ? sanitizeString(readParam(source, PWA_PREVIEW_PARAMS.logoUrl))
      : null,
    fontFamily: enabled
      ? sanitizeFontFamily(readParam(source, PWA_PREVIEW_PARAMS.fontFamily))
      : null,
  }
}
