import type { ProviderDefinition } from "../../core/types.ts";

import { ip2locationActions } from "./actions.ts";

const service = "ip2location";

/**
 * IP2Location.io provider backed by IP2Location and IP2WHOIS APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IP2Location.io",
  categories: ["Location", "Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IP2LOCATION_API_KEY",
      description:
        "IP2Location.io API key passed with the key query parameter. Sign up for the Free Plan to get one: https://www.ip2location.io/ip2location-documentation",
    },
  ],
  homepageUrl: "https://www.ip2location.io",
  actions: ip2locationActions,
};
