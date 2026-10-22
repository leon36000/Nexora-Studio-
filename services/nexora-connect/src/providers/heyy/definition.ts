import type { ProviderDefinition } from "../../core/types.ts";

import { heyyActions } from "./actions.ts";

const service = "heyy";

/**
 * Heyy provider backed by the Heyy REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Heyy",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "heyy_api_key",
      description: "Heyy API key sent as a bearer token. Create it in the Heyy app under Settings > API Keys.",
    },
  ],
  homepageUrl: "https://heyy.io",
  actions: heyyActions,
};
