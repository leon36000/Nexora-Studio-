import type { ProviderDefinition } from "../../core/types.ts";

import { geocodioActions } from "./actions.ts";

const service = "geocodio";

/**
 * Geocodio geocoding provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Geocodio",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GEOCODIO_API_KEY",
      description:
        "Geocodio API key used as the api_key query parameter. Create or manage it at https://dash.geocod.io/apikey.",
    },
  ],
  homepageUrl: "https://www.geocod.io",
  actions: geocodioActions,
};
