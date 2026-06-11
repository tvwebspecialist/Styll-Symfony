// Single source of truth for tenant font handling across the PWA.
//
// outfit / poppins / inter are bundled at build time via next/font in the root
// layout (apps/web/src/app/layout.tsx) and exposed as `--font-*` CSS variables,
// so they never trigger a runtime network request and cannot cause FOUC.
//
// playfair / montserrat are NOT bundled — they are fetched from Google Fonts.
// To avoid FOUC the persisted tenant font must be requested in the
// server-rendered <head> (see app/tenant/app/[slug]/layout.tsx); only the
// unsaved dashboard live preview loads them client-side.

export const DEFAULT_FONT_KEY = 'outfit'

export const FONT_FAMILY_MAP: Record<string, string> = {
  outfit: 'var(--font-outfit)',
  poppins: 'var(--font-poppins)',
  inter: 'var(--font-inter)',
  playfair: '"Playfair Display", serif',
  montserrat: '"Montserrat", sans-serif',
}

// Keep `&display=swap` so the fallback paints immediately while the web font
// downloads (flash of fallback text, never invisible text).
export const GOOGLE_FONT_URLS: Record<string, string> = {
  playfair:
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap',
  montserrat:
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
}

export function normalizeFontKey(fontKey: string | null | undefined): string {
  return (fontKey ?? DEFAULT_FONT_KEY).toLowerCase()
}

export function resolveFontFamily(fontKey: string | null | undefined): string {
  const key = normalizeFontKey(fontKey)
  return FONT_FAMILY_MAP[key] ?? FONT_FAMILY_MAP[DEFAULT_FONT_KEY]
}

// True only for fonts that need a runtime Google Fonts stylesheet (not bundled
// via next/font). Used to decide whether a <link> must be emitted.
export function isRuntimeGoogleFont(fontKey: string | null | undefined): boolean {
  if (!fontKey) return false
  return fontKey.toLowerCase() in GOOGLE_FONT_URLS
}
