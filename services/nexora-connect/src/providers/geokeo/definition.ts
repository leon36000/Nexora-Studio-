import type { ProviderDefinition } from "../../core/types.ts";

import { geokeoActions } from "./actions.ts";

const service = "geokeo";

/**
 * Geokeo JSON geocoding provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Geokeo",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GEOKEO_API_KEY",
      description:
        "Geokeo API key sent as the api query parameter. Sign in at https://geokeo.com/login.php, then open Dashboard -> API to copy the key.",
    },
  ],
  homepageUrl: "https://geokeo.com",
  actions: geokeoActions,
};
