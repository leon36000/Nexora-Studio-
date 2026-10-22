import type { ProviderDefinition } from "../../core/types.ts";

import { ipgeolocationIoActions } from "./actions.ts";

const service = "ipgeolocation_io";

/**
 * IPGeolocation.io provider backed by public geolocation, time zone, and astronomy APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IPGeolocation.io",
  categories: ["Location", "Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IPGEOLOCATION_IO_API_KEY",
      description:
        "IPGeolocation.io API key passed as the apiKey query parameter. Get or manage API keys in the IPGeolocation.io dashboard: https://app.ipgeolocation.io/.",
    },
  ],
  homepageUrl: "https://ipgeolocation.io/",
  actions: ipgeolocationIoActions,
};
