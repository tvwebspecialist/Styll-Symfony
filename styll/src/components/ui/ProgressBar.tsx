import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  label,
  showLabel = false,
  size = 'md',
  color,
}) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={className}>
      {(label || showLabel) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          {label && <span>{label}</span>}
          {showLabel && <span>{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-500`}
          style={{
            width: `${percent}%`,
            backgroundColor: color ?? 'var(--color-primary)',
          }}
        />
      </div>
    </div>
  )
}
