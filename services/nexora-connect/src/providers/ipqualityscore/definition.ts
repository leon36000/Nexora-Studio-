import type { ProviderDefinition } from "../../core/types.ts";

import { ipqualityscoreActions } from "./actions.ts";

const service = "ipqualityscore";

/**
 * IPQualityScore provider backed by the public fraud detection APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "IPQualityScore",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IPQUALITYSCORE_API_KEY",
      description:
        "IPQualityScore API key embedded in fraud detection API request URLs. Create or view API keys from the IPQS user dashboard: https://www.ipqualityscore.com/user/settings.",
    },
  ],
  homepageUrl: "https://www.ipqualityscore.com/",
  actions: ipqualityscoreActions,
};
