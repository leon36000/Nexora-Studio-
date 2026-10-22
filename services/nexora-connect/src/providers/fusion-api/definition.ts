import type { ProviderDefinition } from "../../core/types.ts";

import { fusionApiActions } from "./actions.ts";

const service = "fusion-api";

export const provider: ProviderDefinition = {
  service,
  displayName: "OOMOL Fusion API",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "OOMOL API Key",
      placeholder: "oomol_...",
      description:
        "OOMOL API key sent with the Authorization Bearer header to https://fusion-api.oomol.com. Create or manage keys from the OOMOL console API keys page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.oomol.com",
  actions: fusionApiActions,
};
