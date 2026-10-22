import type { ProviderDefinition } from "../../core/types.ts";

import { scraperapiActions } from "./actions.ts";

const service = "scraperapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "ScraperAPI",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SCRAPERAPI_API_KEY",
      description:
        "ScraperAPI API key passed as the api_key query parameter. Find it in your ScraperAPI dashboard API key page: https://dashboard.scraperapi.com/account.",
    },
  ],
  homepageUrl: "https://www.scraperapi.com",
  actions: scraperapiActions,
};
