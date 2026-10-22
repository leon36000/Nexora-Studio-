import type { ProviderDefinition } from "../../core/types.ts";

import { gammaActions } from "./actions.ts";

const service = "gamma";

/**
 * Gamma provider backed by the public Gamma API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gamma",
  categories: ["AI", "Design & Media", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-gamma-...",
      description:
        "Gamma API key sent with the X-API-KEY header. Generate or manage it from Settings > API Keys: https://gamma.app/settings/api-keys.",
    },
  ],
  homepageUrl: "https://gamma.app",
  actions: gammaActions,
};
