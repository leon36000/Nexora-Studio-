import type { ProviderDefinition } from "../../core/types.ts";

import { ip2proxyActions } from "./actions.ts";

const service = "ip2proxy";

/**
 * IP2Proxy provider backed by the public IP2Proxy Web Service.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IP2Proxy",
  categories: ["Security", "Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IP2PROXY_API_KEY",
      description:
        "IP2Proxy Web Service API key passed with the key query parameter. Existing customers can sign in through the IP2Location client area to view it: https://www.ip2location.com/client-area. The official product page documents the current signup status: https://www.ip2location.com/web-service/ip2proxy",
    },
  ],
  homepageUrl: "https://www.ip2location.com/web-service/ip2proxy",
  actions: ip2proxyActions,
};
