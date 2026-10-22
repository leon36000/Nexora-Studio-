import type { ProviderDefinition } from "../../core/types.ts";

import { shipdayActions } from "./actions.ts";

const service = "shipday";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shipday",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHIPDAY_API_KEY",
      description:
        "Shipday API key used as the Authorization: Basic header value. Create or view it from the Shipday dashboard API settings: https://docs.shipday.com/reference.",
    },
  ],
  homepageUrl: "https://www.shipday.com/",
  actions: shipdayActions,
};
