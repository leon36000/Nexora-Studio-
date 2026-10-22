import type { ProviderDefinition } from "../../core/types.ts";

import { hunterActions } from "./actions.ts";

const service = "hunter";

/**
 * Hunter provider backed by the Hunter API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Hunter",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HUNTER_API_KEY",
      description:
        "Hunter API key passed with the X-API-KEY header. Find or create it on your Hunter dashboard API page.",
    },
  ],
  homepageUrl: "https://hunter.io",
  actions: hunterActions,
};
