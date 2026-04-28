import { create } from 'zustand'
import type { WorkMode } from '@/types/database'

export type OnboardingStep = 1 | 2 | 3

interface OnboardingState {
  workMode: WorkMode | null
  fullName: string
  step: OnboardingStep
  setWorkMode: (mode: WorkMode | null) => void
  setFullName: (name: string) => void
  setStep: (step: OnboardingStep) => void
  reset: () => void
}

const initialState = {
  workMode: null,
  fullName: '',
  step: 1 as OnboardingStep,
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setWorkMode: (workMode) => set({ workMode }),
  setFullName: (fullName) => set({ fullName }),
  setStep: (step) => set({ step }),
  reset: () => set(initialState),
}))
