import type { BusinessType, OpeningHourRow, StaffRole, WorkMode } from '@/types/database'

export const ONBOARDING_STORAGE_KEY = 'styll_onboarding'

export interface OnboardingServiceItem {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export interface OnboardingState {
  step1: {
    name: string
    business_type: BusinessType | ''
    phone: string
    address: string
    city: string
  }
  step2: {
    work_mode: WorkMode
  }
  step3: {
    services: OnboardingServiceItem[]
  }
  step4: {
    hours: OpeningHourRow[]
  }
  staff: {
    members: { name: string; email: string; role: StaffRole }[]
  }
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Lunedì',
  1: 'Martedì',
  2: 'Mercoledì',
  3: 'Giovedì',
  4: 'Venerdì',
  5: 'Sabato',
  6: 'Domenica',
}

export const DEFAULT_HOURS: OpeningHourRow[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d,
  is_open: d !== 6,
  open_time: '09:00',
  close_time: '19:00',
}))

export const DEFAULT_STATE: OnboardingState = {
  step1: { name: '', business_type: '', phone: '', address: '', city: '' },
  step2: { work_mode: 'solo' },
  step3: { services: [] },
  step4: { hours: DEFAULT_HOURS },
  staff: { members: [] },
}

function deepMerge<T>(base: T, partial: Partial<T> | undefined): T {
  if (!partial) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const k of Object.keys(partial)) {
    const v = (partial as Record<string, unknown>)[k]
    const b = out[k]
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      b &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      out[k] = deepMerge(b as Record<string, unknown>, v as Record<string, unknown>)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out as T
}

export const onboardingStorage = {
  read(): OnboardingState {
    if (typeof window === 'undefined') return DEFAULT_STATE
    try {
      const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
      if (!raw) return DEFAULT_STATE
      return deepMerge(DEFAULT_STATE, JSON.parse(raw) as Partial<OnboardingState>)
    } catch {
      return DEFAULT_STATE
    }
  },
  write(state: OnboardingState): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* noop */
    }
  },
  patch<K extends keyof OnboardingState>(
    key: K,
    value: Partial<OnboardingState[K]>
  ): OnboardingState {
    const current = this.read()
    const merged: OnboardingState = {
      ...current,
      [key]: deepMerge(current[key], value as Partial<OnboardingState[K]>),
    }
    this.write(merged)
    return merged
  },
  set<K extends keyof OnboardingState>(key: K, value: OnboardingState[K]): OnboardingState {
    const current = this.read()
    const merged: OnboardingState = { ...current, [key]: value }
    this.write(merged)
    return merged
  },
  clear(): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY)
  },
}

export interface ServicePreset extends OnboardingServiceItem {
  preselected?: boolean
}

export const SERVICE_PRESETS: Record<
  'barbiere' | 'parrucchiere' | 'salone_misto' | 'altro',
  ServicePreset[]
> = {
  barbiere: [
    { id: 'b-taglio', name: 'Taglio classico', price: 15, duration_minutes: 30, preselected: true },
    { id: 'b-taglio-barba', name: 'Taglio + Barba', price: 22, duration_minutes: 45, preselected: true },
    { id: 'b-rifinitura', name: 'Rifinitura barba', price: 10, duration_minutes: 20, preselected: true },
    { id: 'b-shave', name: 'Shave completo', price: 18, duration_minutes: 30, preselected: true },
    { id: 'b-colore', name: 'Colore', price: 35, duration_minutes: 60 },
    { id: 'b-sopracciglia', name: 'Sopracciglia', price: 8, duration_minutes: 15 },
    { id: 'b-trattamento', name: 'Trattamento', price: 35, duration_minutes: 60 },
    { id: 'b-bambini', name: 'Bambini', price: 10, duration_minutes: 20 },
    { id: 'b-studente', name: 'Taglio studente', price: 12, duration_minutes: 25 },
  ],
  parrucchiere: [
    { id: 'p-taglio', name: 'Taglio', price: 25, duration_minutes: 45, preselected: true },
    { id: 'p-piega', name: 'Piega', price: 20, duration_minutes: 30, preselected: true },
    { id: 'p-colore', name: 'Colore', price: 60, duration_minutes: 90, preselected: true },
    { id: 'p-meches', name: 'Colpi/Meches', price: 80, duration_minutes: 120 },
    { id: 'p-trattamento', name: 'Trattamento', price: 30, duration_minutes: 45 },
    { id: 'p-stiratura', name: 'Stiratura', price: 50, duration_minutes: 60 },
    { id: 'p-permanente', name: 'Permanente', price: 70, duration_minutes: 90 },
  ],
  salone_misto: [
    { id: 'm-taglio-uomo', name: 'Taglio uomo', price: 18, duration_minutes: 30, preselected: true },
    { id: 'm-taglio-donna', name: 'Taglio donna', price: 25, duration_minutes: 45, preselected: true },
    { id: 'm-barba', name: 'Barba', price: 12, duration_minutes: 20, preselected: true },
    { id: 'm-piega', name: 'Piega', price: 20, duration_minutes: 30 },
    { id: 'm-colore', name: 'Colore', price: 50, duration_minutes: 75 },
    { id: 'm-trattamento', name: 'Trattamento', price: 30, duration_minutes: 45 },
  ],
  altro: [
    { id: 'a-servizio-1', name: 'Servizio 1', price: 20, duration_minutes: 30, preselected: true },
    { id: 'a-servizio-2', name: 'Servizio 2', price: 30, duration_minutes: 45, preselected: true },
    { id: 'a-servizio-3', name: 'Servizio 3', price: 40, duration_minutes: 60 },
  ],
}

export type ServicePresetKey = keyof typeof SERVICE_PRESETS

export function totalSteps(workMode: WorkMode): number {
  return workMode === 'team' ? 5 : 4
}

export function stepNumber(
  route: 'step-1' | 'step-2' | 'step-3' | 'step-4' | 'staff',
  workMode: WorkMode
): number {
  switch (route) {
    case 'step-1':
      return 1
    case 'step-2':
      return 2
    case 'step-3':
      return 3
    case 'step-4':
      return 4
    case 'staff':
      return workMode === 'team' ? 5 : 4
  }
}

export function isStateReadyForStep(
  state: OnboardingState,
  step: 'step-2' | 'step-3' | 'step-4' | 'staff'
): boolean {
  const s1 = state.step1.name.trim() && state.step1.address.trim() && state.step1.city.trim()
  if (step === 'step-2') return !!s1
  if (step === 'step-3') return !!s1
  if (step === 'step-4') return !!s1 && state.step3.services.length > 0
  if (step === 'staff') {
    return !!s1 && state.step3.services.length > 0 && state.step2.work_mode === 'team'
  }
  return false
}
