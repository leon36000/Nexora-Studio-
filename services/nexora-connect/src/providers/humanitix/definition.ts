import type { ProviderDefinition } from "../../core/types.ts";

import { humanitixActions } from "./actions.ts";

const service = "humanitix";

/**
 * Humanitix provider backed by the public Humanitix API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Humanitix",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Key",
      placeholder: "HUMANITIX_API_KEY",
      description:
        "Humanitix public API key sent with the x-api-key header. Generate it from your Humanitix account public API settings.",
    },
  ],
  homepageUrl: "https://humanitix.com",
  actions: humanitixActions,
};
