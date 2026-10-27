'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { getEnv, isTruthy } from '@/lib/core/config/env'

const PostHogProvider = dynamic(() =>
  import('@/app/_shell/providers/posthog-provider').then((module) => module.PostHogProvider)
)

interface PostHogGateProps {
  children: ReactNode
  consentRequired?: boolean
}

/**
 * Loads the PostHog client only on an instance that enabled it. Nexora sends nothing to a third party
 * by default, so the 210 KB analytics library stays out of every page unless an operator sets both
 * `NEXT_PUBLIC_POSTHOG_ENABLED` and a key.
 */
export function PostHogGate({ children, consentRequired = false }: PostHogGateProps) {
  const enabled =
    isTruthy(getEnv('NEXT_PUBLIC_POSTHOG_ENABLED')) && Boolean(getEnv('NEXT_PUBLIC_POSTHOG_KEY'))
  if (!enabled) return <>{children}</>
  return <PostHogProvider consentRequired={consentRequired}>{children}</PostHogProvider>
}
