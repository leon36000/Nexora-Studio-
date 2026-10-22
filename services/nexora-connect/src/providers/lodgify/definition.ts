import type { ProviderDefinition } from "../../core/types.ts";

import { lodgifyActions } from "./actions.ts";

const service = "lodgify";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lodgify",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "lodgify_api_key",
      description:
        "Lodgify API key sent with the X-ApiKey header. Create or view API keys in Lodgify account settings: https://docs.lodgify.com/docs/getting-started-1.",
    },
  ],
  homepageUrl: "https://www.lodgify.com/",
  actions: lodgifyActions,
};
