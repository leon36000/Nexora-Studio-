import type { ProviderDefinition } from "../../core/types.ts";

import { workizActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "workiz",
  displayName: "Workiz",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "YOUR_WORKIZ_API_TOKEN",
      description:
        "Workiz account API token inserted into the official API path. Enable Developer API and copy the token from Settings > Integrations > Developer.",
    },
  ],
  homepageUrl: "https://www.workiz.com",
  actions: workizActions,
};
