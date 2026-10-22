import type { ProviderDefinition } from "../../core/types.ts";

import { verifiedemailActions } from "./actions.ts";

const service = "verifiedemail";

export const provider: ProviderDefinition = {
  service,
  displayName: "VerifiedEmail",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "VERIFIEDEMAIL_API_KEY",
      description:
        "VerifiedEmail API key sent with the Authorization Bearer header. Create or manage API keys in the VerifiedEmail dashboard: https://app.verified.email/apikeys",
    },
  ],
  homepageUrl: "https://verified.email",
  actions: verifiedemailActions,
};
