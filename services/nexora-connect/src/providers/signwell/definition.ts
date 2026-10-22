import type { ProviderDefinition } from "../../core/types.ts";

import { signwellActions } from "./actions.ts";

const service = "signwell";

export const provider: ProviderDefinition = {
  service,
  displayName: "SignWell",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "signwell_api_key",
      description:
        "SignWell API key used with the X-Api-Key header. Get it from Settings > API as described in the official getting started docs: https://developers.signwell.com/reference/getting-started-with-your-api-1",
    },
  ],
  homepageUrl: "https://www.signwell.com",
  actions: signwellActions,
};
