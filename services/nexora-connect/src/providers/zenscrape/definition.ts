import type { ProviderDefinition } from "../../core/types.ts";

import { zenscrapeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "zenscrape",
  displayName: "Zenscrape",
  description: "Fetch web pages through Zenscrape proxies with optional browser rendering.",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZENSCRAPE_API_KEY",
      description:
        "Zenscrape API key passed as the apikey query parameter. Register or view your key in the Zenscrape app: https://app.zenscrape.com/register",
    },
  ],
  homepageUrl: "https://zenscrape.com",
  actions: zenscrapeActions,
};
