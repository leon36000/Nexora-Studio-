import type { ProviderDefinition } from "../../core/types.ts";

import { scrapingantActions } from "./actions.ts";

const service = "scrapingant";

export const provider: ProviderDefinition = {
  service,
  displayName: "ScrapingAnt",
  categories: ["AI", "Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SCRAPINGANT_API_KEY",
      description: "ScrapingAnt API key sent as the x-api-key query parameter.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://scrapingant.com",
  actions: scrapingantActions,
};
