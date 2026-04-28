import type { WorkMode } from './database'

export interface OnboardingFormValues {
  fullName: string
  workMode: WorkMode
}

export interface OnboardingActionResult {
  success: boolean
  error?: string
}
