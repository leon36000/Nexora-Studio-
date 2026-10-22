import type { ProviderDefinition } from "../../core/types.ts";

import { scrapflyActions } from "./actions.ts";

const service = "scrapfly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Scrapfly",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SCRAPFLY_API_KEY",
      description: "Scrapfly API key used as the key query parameter.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://scrapfly.io/",
  actions: scrapflyActions,
};
