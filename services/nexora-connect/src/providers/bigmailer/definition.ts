import type { ProviderDefinition } from "../../core/types.ts";

import { bigmailerActions } from "./actions.ts";

const service = "bigmailer";

export const provider: ProviderDefinition = {
  service,
  displayName: "BigMailer",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BIGMAILER_API_KEY",
      description:
        "BigMailer REST API key sent in the X-API-Key header. Create or view API keys from the BigMailer API documentation and account settings: https://docs.bigmailer.io/.",
    },
  ],
  homepageUrl: "https://www.bigmailer.io/",
  actions: bigmailerActions,
};
