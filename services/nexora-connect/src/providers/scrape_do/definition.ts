import type { ProviderDefinition } from "../../core/types.ts";

import { scrapeDoActions } from "./actions.ts";

const service = "scrape_do";

export const provider: ProviderDefinition = {
  service,
  displayName: "Scrape.do",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SCRAPE_DO_TOKEN",
      description:
        "Scrape.do API token passed as the token query parameter. Create or copy it from the Scrape.do dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://scrape.do",
  actions: scrapeDoActions,
};
