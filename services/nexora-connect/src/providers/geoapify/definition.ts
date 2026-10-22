import type { ProviderDefinition } from "../../core/types.ts";

import { geoapifyActions } from "./actions.ts";

const service = "geoapify";

/**
 * Geoapify geocoding and routing provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Geoapify",
  categories: ["Location", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GEOAPIFY_API_KEY",
      description:
        "Geoapify API key sent as the apiKey query parameter. Create it on the Geoapify MyProjects page: https://myprojects.geoapify.com/.",
    },
  ],
  homepageUrl: "https://www.geoapify.com",
  actions: geoapifyActions,
};
