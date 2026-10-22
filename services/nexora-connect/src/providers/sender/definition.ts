import type { ProviderDefinition } from "../../core/types.ts";

import { senderActions } from "./actions.ts";

const service = "sender";

export const provider: ProviderDefinition = {
  service,
  displayName: "Sender",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Token",
      placeholder: "sender_api_token",
      description:
        "Sender API access token used with the Authorization Bearer header. Create or manage it in Sender account settings: https://app.sender.net/settings/tokens.",
    },
  ],
  homepageUrl: "https://www.sender.net",
  actions: senderActions,
};
