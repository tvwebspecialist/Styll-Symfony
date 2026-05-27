'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  children: React.ReactNode
  /** Delay between consecutive items in seconds. Default: 0.08 */
  staggerDelay?: number
  className?: string
}

export default function AnimatedList({ children, staggerDelay = 0.08, className }: Props) {
  const { ref, isInView } = useScrollAnimation()
  const shouldReduceMotion = useReducedMotion()

  const items = React.Children.toArray(children)

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
          animate={
            isInView
              ? { opacity: 1, y: 0 }
              : shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 30 }
          }
          transition={{
            duration: shouldReduceMotion ? 0 : 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
            delay: shouldReduceMotion ? 0 : i * staggerDelay,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
