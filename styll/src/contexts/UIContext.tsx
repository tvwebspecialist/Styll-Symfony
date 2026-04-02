import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ToastMessage } from '../types/common'

interface UIContextValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toasts: ToastMessage[]
  showToast: (toast: Omit<ToastMessage, 'id'>) => void
  hideToast: (id: string) => void
  modalContent: React.ReactNode | null
  showModal: (content: React.ReactNode) => void
  hideModal: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

let toastCounter = 0

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null)

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter}`
    const duration = toast.duration ?? 4000
    setToasts(prev => [...prev, { ...toast, id }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showModal = useCallback((content: React.ReactNode) => {
    setModalContent(content)
  }, [])

  const hideModal = useCallback(() => {
    setModalContent(null)
  }, [])

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toasts,
        showToast,
        hideToast,
        modalContent,
        showModal,
        hideModal,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export const useUIContext = (): UIContextValue => {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUIContext must be used within UIProvider')
  return ctx
}
