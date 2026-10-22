import type { ProviderDefinition } from "../../core/types.ts";

import { digistore24Actions } from "./actions.ts";

const service = "digistore24";

export const provider: ProviderDefinition = {
  service,
  displayName: "Digistore24",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DIGISTORE24_API_KEY",
      description:
        "Digistore24 API key sent with the X-DS-API-KEY header. Create it in vendor view under Settings > Account access > API keys: https://help.digistore24.com/hc/en-us/articles/23658595845009-Create-API-key.",
    },
  ],
  homepageUrl: "https://www.digistore24.com",
  actions: digistore24Actions,
};
