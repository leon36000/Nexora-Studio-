/**
 * Nexora edition: the « Autoriser / Refuser » cards of the answer being streamed. The stream's
 * `confirmation` frame opens a card, the server's `confirmation_end` frame closes it (whatever
 * closed it: this tab's click, another tab, or the timeout), and the person's click only marks it
 * busy until then.
 */

export interface ConfirmationRequestData {
  id: string
  token: string
  title: string
  toolName: string
  summary: string
  expiresAt: string
}

export interface ConfirmationItem extends ConfirmationRequestData {
  state: 'pending' | 'allowed' | 'denied' | 'expired'
  busy: boolean
  problem: 'failed' | 'already-answered' | null
}

export type ConfirmationAction =
  | { type: 'asked'; request: ConfirmationRequestData }
  | { type: 'sending'; id: string }
  | { type: 'problem'; id: string; problem: 'failed' | 'already-answered' }
  | { type: 'ended'; end: { id: string; decision: 'allow' | 'deny' | 'expired' } }
  | { type: 'cleared' }

const STATE_OF_DECISION = { allow: 'allowed', deny: 'denied', expired: 'expired' } as const

function update(
  items: ConfirmationItem[],
  id: string,
  change: Partial<ConfirmationItem>
): ConfirmationItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...change } : item))
}

export function confirmationsReducer(
  items: ConfirmationItem[],
  action: ConfirmationAction
): ConfirmationItem[] {
  switch (action.type) {
    case 'asked':
      if (items.some((item) => item.id === action.request.id)) return items
      return [...items, { ...action.request, state: 'pending', busy: false, problem: null }]
    case 'sending':
      return update(items, action.id, { busy: true, problem: null })
    case 'problem':
      return update(items, action.id, { busy: false, problem: action.problem })
    case 'ended':
      return update(items, action.end.id, {
        state: STATE_OF_DECISION[action.end.decision],
        busy: false,
        problem: null,
      })
    case 'cleared':
      return []
  }
}
