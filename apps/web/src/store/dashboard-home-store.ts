import { create } from 'zustand'

interface DashboardHomeStore {
  greeting: string
  subtitle: string
  ready: boolean
  setHomeData: (greeting: string, subtitle: string) => void
}

export const useDashboardHomeStore = create<DashboardHomeStore>((set) => ({
  greeting: '',
  subtitle: '',
  ready: false,
  setHomeData: (greeting, subtitle) => set({ greeting, subtitle, ready: true }),
}))
