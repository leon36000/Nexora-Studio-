import type { ProviderDefinition } from "../../core/types.ts";

import { mailboxlayerActions } from "./actions.ts";

const service = "mailboxlayer";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailboxlayer",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAILBOXLAYER_API_KEY",
      description:
        "Mailboxlayer uses your APILayer API key as the access_key query parameter. Find or rotate it on your APILayer Account page: https://apilayer.com/docs/article/managing-api-keys.",
    },
  ],
  homepageUrl: "https://mailboxlayer.com",
  actions: mailboxlayerActions,
};
