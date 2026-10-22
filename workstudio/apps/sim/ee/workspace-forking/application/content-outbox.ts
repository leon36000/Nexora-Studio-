// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { OutboxHandlerRegistry } from '@/lib/core/outbox/service'
import { FORK_CONTENT_COPY_EVENT } from '@/ee/workspace-forking/application/content-outbox-event'

export const forkContentOutboxHandlers: OutboxHandlerRegistry = {
  [FORK_CONTENT_COPY_EVENT]: async () => {},
}
