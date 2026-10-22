import type { ProviderDefinition } from "../../core/types.ts";

import { xataActions } from "./actions.ts";

const service = "xata";

export const provider: ProviderDefinition = {
  service,
  displayName: "Xata",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "XATA_API_KEY",
      description:
        "Xata API key sent as an Authorization Bearer token. Create and manage API keys with the Xata CLI or console: https://xata.io/docs/platform/api-key.",
    },
  ],
  homepageUrl: "https://xata.io/",
  actions: xataActions,
};
