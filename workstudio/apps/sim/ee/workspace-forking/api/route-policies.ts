// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { internalOrchestrationErrorPolicy } from '@/lib/api/server/routes/internal-json-route'
import { v2OrchestrationErrorPolicy } from '@/lib/api/server/routes/v2-json-route'

/** Disabled use cases throw `not_found`, which the core default policies already render as 404. */
export const internalForkErrorPolicy = internalOrchestrationErrorPolicy
export const v2ForkErrorPolicy = v2OrchestrationErrorPolicy
