import type { ProviderDefinition } from "../../core/types.ts";

import { ip2whoisActions } from "./actions.ts";

const service = "ip2whois";

/**
 * IP2WHOIS provider backed by the public IP2WHOIS APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IP2WHOIS",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IP2WHOIS_API_KEY",
      description:
        "IP2WHOIS API key passed with the key query parameter. Register for a free account to get your key: https://www.ip2location.io/ip2whois-documentation",
    },
  ],
  homepageUrl: "https://www.ip2location.io/ip2whois-documentation",
  actions: ip2whoisActions,
};
