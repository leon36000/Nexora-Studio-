import type { ProviderDefinition } from "../../core/types.ts";

import { superviselyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "supervisely",
  displayName: "Supervisely",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SUPERVISELY_API_TOKEN",
      description:
        "Supervisely API token sent with the x-api-key header. Create or copy it from Account Settings > API Tokens.",
    },
  ],
  homepageUrl: "https://supervisely.com",
  actions: superviselyActions,
};
