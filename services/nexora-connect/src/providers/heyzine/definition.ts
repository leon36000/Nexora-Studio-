import type { ProviderDefinition } from "../../core/types.ts";

import { heyzineActions } from "./actions.ts";

const service = "heyzine";

/**
 * Heyzine provider backed by the Heyzine API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Heyzine",
  categories: ["Design & Media", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "heyzine_api_key",
      description:
        "Heyzine API key sent with the Authorization: Bearer header. Log in or register on the developers page to view it.",
    },
  ],
  homepageUrl: "https://heyzine.com",
  actions: heyzineActions,
};
