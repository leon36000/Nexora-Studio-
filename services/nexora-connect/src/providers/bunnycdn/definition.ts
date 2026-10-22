import type { ProviderDefinition } from "../../core/types.ts";

import { bunnycdnActions } from "./actions.ts";

const service = "bunnycdn";

export const provider: ProviderDefinition = {
  service,
  displayName: "BunnyCDN",
  categories: ["Storage", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "bunny_api_key",
      description:
        "Bunny account API key sent with the AccessKey header. Create or view it from the Bunny dashboard API Keys page: https://docs.bunny.net/account/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://bunny.net/",
  actions: bunnycdnActions,
};
