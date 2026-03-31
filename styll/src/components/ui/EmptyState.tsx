import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
    {icon && (
      <div className="mb-4 text-gray-300 text-5xl" aria-hidden>
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-700 mb-2">{title}</h3>
    {message && <p className="text-sm text-gray-500 max-w-xs mb-6">{message}</p>}
    {action && <div>{action}</div>}
  </div>
)
