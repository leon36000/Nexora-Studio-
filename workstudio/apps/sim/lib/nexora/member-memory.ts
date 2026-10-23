/**
 * The agent memory key of a conversation held through a members-only chat: the signed-in
 * member's id, then the conversation id the page sent. The server builds it from the session, so
 * a member who sends another member's conversation id reaches an empty memory of their own.
 */
export function memberMemoryKey(userId: string, conversationId: string): string {
  return `${userId}:${conversationId}`
}
