import type { ProviderDefinition } from "../../core/types.ts";

import { klazifyActions } from "./actions.ts";

const service = "klazify";

/**
 * Klazify provider backed by the public Klazify API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Klazify",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KLAZIFY_API_KEY",
      description:
        "Klazify API key used with the Authorization: Bearer header. Create or copy it from the Klazify dashboard after starting a free trial: https://www.klazify.com/register",
    },
  ],
  homepageUrl: "https://www.klazify.com",
  actions: klazifyActions,
};
