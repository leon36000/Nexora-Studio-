import type { ProviderDefinition } from "../../core/types.ts";

import { mailsSoActions } from "./actions.ts";

const service = "mails_so";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mails",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "mails_api_key",
      description:
        "Mails API key used with the x-mails-api-key header. Create a Mails account and copy the key from your account settings.",
    },
  ],
  homepageUrl: "https://mails.so",
  actions: mailsSoActions,
};
