import type { ProviderDefinition } from "../../core/types.ts";

import { openseaActions } from "./actions.ts";

const service = "opensea";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenSea",
  categories: ["Data", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "opensea_api_key",
      description:
        "OpenSea API key sent with the x-api-key header. Create or view an API key from the official API Keys page: https://docs.opensea.io/reference/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://opensea.io",
  actions: openseaActions,
};
