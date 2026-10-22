import type { ProviderDefinition } from "../../core/types.ts";

import { replyIoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "reply_io",
  displayName: "Reply.io",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "REPLY_IO_API_KEY",
      description:
        "Reply.io API key sent as an Authorization Bearer token. Create or copy it in the Reply.io dashboard under Settings > API Key: https://run.reply.io.",
    },
  ],
  homepageUrl: "https://reply.io",
  actions: replyIoActions,
};
