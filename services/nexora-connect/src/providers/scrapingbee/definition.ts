import type { ProviderDefinition } from "../../core/types.ts";

import { scrapingbeeActions } from "./actions.ts";

const service = "scrapingbee";

export const provider: ProviderDefinition = {
  service,
  displayName: "ScrapingBee",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SCRAPINGBEE_API_KEY",
      description: "ScrapingBee API key passed with the api_key query parameter.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.scrapingbee.com",
  actions: scrapingbeeActions,
};
