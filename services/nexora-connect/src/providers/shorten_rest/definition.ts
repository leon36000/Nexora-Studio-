import type { ProviderDefinition } from "../../core/types.ts";

import { shortenRestActions } from "./actions.ts";

const service = "shorten_rest";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shorten.REST",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "shorten_rest_api_key",
      description:
        "Shorten.REST API key sent with the x-api-key header. Create or copy it from the Shorten.REST dashboard: https://dash.shorten.rest.",
    },
  ],
  homepageUrl: "https://shorten.rest",
  actions: shortenRestActions,
};
