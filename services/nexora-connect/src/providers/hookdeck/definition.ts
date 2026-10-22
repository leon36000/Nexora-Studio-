import type { ProviderDefinition } from "../../core/types.ts";

import { hookdeckActions } from "./actions.ts";

const service = "hookdeck";

/**
 * Hookdeck provider backed by the Hookdeck API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Hookdeck",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HOOKDECK_API_KEY",
      description: "Hookdeck API key sent as a Bearer token. Find it in your Hookdeck project secrets settings.",
    },
  ],
  homepageUrl: "https://hookdeck.com",
  actions: hookdeckActions,
};
