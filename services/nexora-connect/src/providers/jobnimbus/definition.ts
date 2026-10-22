import type { ProviderDefinition } from "../../core/types.ts";

import { jobnimbusActions } from "./actions.ts";

const service = "jobnimbus";

/**
 * JobNimbus provider backed by the public JobNimbus REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "JobNimbus",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "jobnimbus_api_key",
      description:
        "JobNimbus API key used with the Authorization: Bearer header. Create it in JobNimbus under Settings > API Keys, as described in the official authorization docs: https://developer.jobnimbus.com/docs/authorization",
    },
  ],
  homepageUrl: "https://www.jobnimbus.com",
  actions: jobnimbusActions,
};
