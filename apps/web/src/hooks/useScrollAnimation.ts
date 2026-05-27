'use client'

import { useRef } from 'react'
import { useInView, type UseInViewOptions } from 'framer-motion'

type ScrollAnimationOptions = Pick<UseInViewOptions, 'once' | 'amount' | 'margin'>

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const ref = useRef<HTMLElement>(null)

  const inViewOptions: UseInViewOptions = {
    once:   options.once   ?? true,
    amount: options.amount ?? 0.15,
    // Cast: '0px 0px -50px 0px' satisfies MarginType at runtime
    margin: (options.margin ?? '0px 0px -50px 0px') as UseInViewOptions['margin'],
  }

  const isInView = useInView(ref as React.RefObject<Element>, inViewOptions)

  return { ref, isInView }
}
