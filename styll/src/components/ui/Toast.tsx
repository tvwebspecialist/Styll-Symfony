import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useUIContext } from '../../contexts/UIContext'
import type { ToastMessage } from '../../types/common'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
}

const borderColors = {
  success: 'border-l-4 border-green-500',
  error: 'border-l-4 border-red-500',
  warning: 'border-l-4 border-yellow-500',
  info: 'border-l-4 border-blue-500',
}

interface ToastItemProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => (
  <div
    className={`
      flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg
      min-w-72 max-w-sm animate-fadeIn
      ${borderColors[toast.type]}
    `}
    role="alert"
    aria-live="assertive"
  >
    <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
      {toast.message && (
        <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
      )}
    </div>
    <button
      onClick={() => onClose(toast.id)}
      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400"
      aria-label="Chiudi notifica"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useUIContext()

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifiche"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={hideToast} />
      ))}
    </div>
  )
}
