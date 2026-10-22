import type { ProviderDefinition } from "../../core/types.ts";

import { hyperbrowserActions } from "./actions.ts";

const service = "hyperbrowser";

/**
 * Hyperbrowser provider backed by the Hyperbrowser Web API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Hyperbrowser",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "hb_...",
      description:
        "Hyperbrowser API key used with the x-api-key header. Create or copy it from the Hyperbrowser Dashboard quickstart page.",
    },
  ],
  homepageUrl: "https://www.hyperbrowser.ai",
  actions: hyperbrowserActions,
};
