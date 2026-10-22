import type { ProviderDefinition } from "../../core/types.ts";

import { nylasActions } from "./actions.ts";

const service = "nylas";

export const provider: ProviderDefinition = {
  service,
  displayName: "Nylas",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NYLAS_API_KEY",
      description:
        "Nylas API key used with the Authorization Bearer header. Create or view API keys in the Nylas Dashboard: https://dashboard-v3.nylas.com/developer/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.nylas.com",
  actions: nylasActions,
};
