import type { ProviderDefinition } from "../../core/types.ts";

import { kitActions } from "./actions.ts";

const service = "kit";

/**
 * Kit provider backed by the public Kit API v4.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kit",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KIT_API_KEY",
      description:
        "Kit API key sent with the X-Kit-Api-Key request header. Create or copy a personal API key from Kit's developer settings: https://app.kit.com/developer_settings",
    },
  ],
  homepageUrl: "https://kit.com/",
  actions: kitActions,
};
