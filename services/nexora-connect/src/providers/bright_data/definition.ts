import type { ProviderDefinition } from "../../core/types.ts";

import { brightDataActions } from "./actions.ts";

const service = "bright_data";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bright Data",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BRIGHT_DATA_API_KEY",
      description:
        "Bright Data API key sent as a Bearer token in the Authorization header. Create or manage API keys from Bright Data account settings: https://brightdata.com/cp/setting/users.",
    },
  ],
  homepageUrl: "https://brightdata.com",
  actions: brightDataActions,
};
