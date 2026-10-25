import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import { answerToolConfirmationContract } from '@/lib/api/contracts/nexora-tool-confirmations'

/**
 * Sends the person's answer to « Demander avant d'agir ». Resolves `ok` when recorded, `stale`
 * when the request was already answered or expired (the stream's end frame closes the card), and
 * `failed` otherwise. Not a React Query hook: the published chats outside the workspace use it too.
 */
export async function answerToolConfirmation(
  id: string,
  token: string,
  decision: 'allow' | 'deny'
): Promise<'ok' | 'stale' | 'failed'> {
  try {
    await requestJson(answerToolConfirmationContract, { params: { id }, body: { token, decision } })
    return 'ok'
  } catch (error) {
    return isApiClientError(error) && error.status === 409 ? 'stale' : 'failed'
  }
}
