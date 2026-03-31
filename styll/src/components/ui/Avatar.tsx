import React from 'react'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

const stringToColor = (str: string): string => {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500',
  ]
  const index = str.charCodeAt(0) % colors.length
  return colors[index]
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`
        ${sizeClasses[size]} ${stringToColor(name)}
        rounded-full flex items-center justify-center
        font-semibold text-white flex-shrink-0 ${className}
      `}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}
