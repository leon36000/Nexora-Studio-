import { parseAsString } from 'nuqs/server'

/** The Assistant's URL state: the open conversation, empty for a new one. */
export const assistantParsers = {
  conversation: parseAsString.withDefault(''),
} as const

/** Opening a conversation is a destination: Back returns to the previous one. */
export const assistantUrlKeys = {
  history: 'push',
  clearOnDefault: true,
} as const
