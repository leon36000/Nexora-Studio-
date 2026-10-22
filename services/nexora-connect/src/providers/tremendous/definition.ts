import type { ProviderDefinition } from "../../core/types.ts";

import { tremendousActions } from "./actions.ts";

const service = "tremendous";

/**
 * Tremendous provider backed by the public Tremendous API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Tremendous",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROD_... or TEST_...",
      description:
        "Tremendous API key used as a Bearer token. In production, create it from Team settings -> Developers after API access is approved: https://developers.tremendous.com/docs/production-api-access.",
    },
  ],
  homepageUrl: "https://www.tremendous.com",
  actions: tremendousActions,
};
