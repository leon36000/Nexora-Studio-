import type { ProviderDefinition } from "../../core/types.ts";

import { iplocateActions } from "./actions.ts";

const service = "iplocate";

export const provider: ProviderDefinition = {
  service,
  displayName: "IPLocate",
  categories: ["Location", "Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IPLOCATE_API_KEY",
      description:
        "IPLocate API key sent with the X-API-Key request header. Create a free account and get your key at https://www.iplocate.io/signup.",
    },
  ],
  homepageUrl: "https://www.iplocate.io/",
  actions: iplocateActions,
};
