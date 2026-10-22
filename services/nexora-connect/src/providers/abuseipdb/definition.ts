import type { ProviderDefinition } from "../../core/types.ts";

import { abuseipdbActions } from "./actions.ts";

const service = "abuseipdb";

/**
 * AbuseIPDB provider backed by the public AbuseIPDB API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "AbuseIPDB",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ABUSEIPDB_API_KEY",
      description:
        "AbuseIPDB API key sent with the Key header. Get it from your account page under API Settings: https://www.abuseipdb.com/api.html.",
    },
  ],
  homepageUrl: "https://www.abuseipdb.com/",
  actions: abuseipdbActions,
};
