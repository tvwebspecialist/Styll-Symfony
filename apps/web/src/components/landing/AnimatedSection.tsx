'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  children: React.ReactNode
  /** Entry delay in seconds. Default: 0 */
  delay?: number
  /** Movement direction on entry. Default: 'up' */
  direction?: 'up' | 'left' | 'right' | 'none'
  className?: string
}

export default function AnimatedSection({
  children,
  delay = 0,
  direction = 'up',
  className,
}: Props) {
  const { ref, isInView } = useScrollAnimation()
  const shouldReduceMotion = useReducedMotion()

  const hidden = shouldReduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: direction === 'up' ? 40 : 0,
        x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0,
      }

  const visible = {
    opacity: 1,
    y: 0,
    x: 0,
    transition: {
      duration: shouldReduceMotion ? 0 : 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      delay: shouldReduceMotion ? 0 : delay,
    },
  }

  return (
    <motion.div
      ref={ref as React.Ref<HTMLDivElement>}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ hidden, visible }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
