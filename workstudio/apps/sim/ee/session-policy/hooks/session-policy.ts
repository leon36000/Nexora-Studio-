// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { nexoraKey } from '@/ee/_nexora/disabled'

export const sessionPolicyKeys = {
  all: nexoraKey('session-policy'),
  settings: (organizationId: string) => nexoraKey('session-policy', organizationId),
}
