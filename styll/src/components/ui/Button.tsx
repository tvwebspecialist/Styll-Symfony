import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm',
  secondary: 'bg-[var(--color-secondary)] hover:opacity-90 text-white shadow-sm',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : leftIcon ? (
        <span aria-hidden>{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span aria-hidden>{rightIcon}</span>}
    </button>
  )
}
