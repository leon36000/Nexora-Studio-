// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { OutboxHandlerRegistry } from '@/lib/core/outbox/service'
import {
  PERMISSION_ACCESS_REQUEST_CREATED_EVENT,
  PERMISSION_ACCESS_REQUEST_DECIDED_EVENT,
  PERMISSION_ACCESS_REQUEST_NOTIFY_ADMIN_EVENT,
} from '@/ee/access-requests/lib/notification-events'

/** No-op handlers: drains any legacy event without sending mail. */
const drain = async (): Promise<void> => {}

export const permissionAccessRequestOutboxHandlers: OutboxHandlerRegistry = {
  [PERMISSION_ACCESS_REQUEST_CREATED_EVENT]: drain,
  [PERMISSION_ACCESS_REQUEST_NOTIFY_ADMIN_EVENT]: drain,
  [PERMISSION_ACCESS_REQUEST_DECIDED_EVENT]: drain,
}
