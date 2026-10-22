import type { ProviderDefinition } from "../../core/types.ts";

import { scrapeGraphAiActions } from "./actions.ts";

const service = "scrape_graph_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "ScrapeGraphAI",
  categories: ["AI", "Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sgai-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      description: "ScrapeGraphAI API key sent in the SGAI-APIKEY header.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://scrapegraphai.com",
  actions: scrapeGraphAiActions,
};
