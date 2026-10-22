export const slackConversationTypes = ["public_channel", "private_channel", "im", "mpim"] as const;
export const slackNormalizedConversationTypes = ["public_channel", "private_channel", "im", "mpim", "unknown"] as const;

export type SlackNormalizedConversationType = (typeof slackNormalizedConversationTypes)[number];
