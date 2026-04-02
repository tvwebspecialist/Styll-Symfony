import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <div
    className={`${sizeClasses[size]} border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin ${className}`}
    role="status"
    aria-label="Caricamento..."
  />
)

export const PageSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-64">
    <Spinner size="lg" />
  </div>
)
