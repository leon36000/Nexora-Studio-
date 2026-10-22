import type { ProviderDefinition } from "../../core/types.ts";

import { raindropActions } from "./actions.ts";

const service = "raindrop";

/**
 * Raindrop.io provider backed by the public Raindrop.io REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Raindrop.io",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Test Token",
      placeholder: "RAINDROP_TEST_TOKEN",
      description:
        "Raindrop.io Test token sent as Bearer authentication. Create an integration and copy its Test token at https://app.raindrop.io/settings/integrations.",
    },
  ],
  homepageUrl: "https://raindrop.io",
  actions: raindropActions,
};
