import type { ProviderDefinition } from "../../core/types.ts";

import { mindbodyActions } from "./actions.ts";

const service = "mindbody";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mindbody",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MINDBODY_API_KEY",
      description:
        "Mindbody Consumer API key sent with the API-Key header. Create and view API keys in the Mindbody developer portal under Account > API credentials: https://developers.mindbodyonline.com.",
    },
  ],
  homepageUrl: "https://www.mindbodyonline.com",
  actions: mindbodyActions,
};
