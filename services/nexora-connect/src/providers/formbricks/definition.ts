import type { ProviderDefinition } from "../../core/types.ts";

import { formbricksActions } from "./actions.ts";

const service = "formbricks";

/**
 * Formbricks provider backed by the public Formbricks management API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Formbricks",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FORMBRICKS_API_KEY",
      description:
        "Formbricks management API key sent with the x-api-key header. Generate or manage it from the Formbricks API key settings: https://formbricks.com/docs/api-reference/generate-key",
    },
  ],
  homepageUrl: "https://formbricks.com",
  actions: formbricksActions,
};
