// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { nexoraKey } from '@/ee/_nexora/disabled'

export const scimKeys = {
  all: nexoraKey('scim'),
  connection: (organizationId: string) => nexoraKey('scim', 'connection', organizationId),
  mappings: (organizationId: string) => nexoraKey('scim', 'mappings', organizationId),
  activity: (organizationId: string) => nexoraKey('scim', 'activity', organizationId),
}
