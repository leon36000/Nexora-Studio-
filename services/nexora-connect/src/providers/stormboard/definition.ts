import type { ProviderDefinition } from "../../core/types.ts";

import { stormboardActions } from "./actions.ts";

const service = "stormboard";

export const provider: ProviderDefinition = {
  service,
  displayName: "Stormboard",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "stormboard_api_key",
      description:
        "Stormboard API key used with the X-API-Key header. Find it on the API tab of your Stormboard account.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://stormboard.com",
  actions: stormboardActions,
};
