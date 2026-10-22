import type { ProviderDefinition } from "../../core/types.ts";

import { scrapingdogActions } from "./actions.ts";

const service = "scrapingdog";

export const provider: ProviderDefinition = {
  service,
  displayName: "Scrapingdog",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SCRAPINGDOG_API_KEY",
      description:
        "Scrapingdog API key passed with the api_key query parameter. Get it from the official member area: https://api.scrapingdog.com/login.",
    },
  ],
  homepageUrl: "https://www.scrapingdog.com",
  actions: scrapingdogActions,
};
