import type { ProviderDefinition } from "../../core/types.ts";

import { signaturelyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "signaturely",
  displayName: "Signaturely",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "signaturely_api_key",
      description:
        "Signaturely API key sent with the Authorization header. Create or view API keys in Signaturely settings: https://app.signaturely.com/settings/api",
    },
  ],
  homepageUrl: "https://signaturely.com/",
  actions: signaturelyActions,
};
