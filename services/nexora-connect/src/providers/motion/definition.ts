import type { ProviderDefinition } from "../../core/types.ts";

import { motionActions } from "./actions.ts";

const service = "motion";

export const provider: ProviderDefinition = {
  service,
  displayName: "Motion",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "motion_api_key",
      description:
        "Motion API key sent with the X-API-Key header. Create or view API keys from the Motion web app API settings: https://app.usemotion.com/.",
    },
  ],
  homepageUrl: "https://www.usemotion.com",
  actions: motionActions,
};
