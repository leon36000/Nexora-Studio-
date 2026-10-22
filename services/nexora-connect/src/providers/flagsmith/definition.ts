import type { ProviderDefinition } from "../../core/types.ts";

import { flagsmithActions } from "./actions.ts";

const service = "flagsmith";

/**
 * Flagsmith provider backed by the public Flags API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Flagsmith",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Environment Key",
      placeholder: "flagsmith_environment_key",
      description:
        "Flagsmith Environment Key sent with the X-Environment-Key header for the Flags API. Copy it from your Flagsmith environment settings: https://docs.flagsmith.com/sdk-api/flagsmith-api.",
    },
  ],
  homepageUrl: "https://www.flagsmith.com",
  actions: flagsmithActions,
};
