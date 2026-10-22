import type { ProviderDefinition } from "../../core/types.ts";

import { altovizActions } from "./actions.ts";

const service = "altoviz";

export const provider: ProviderDefinition = {
  service,
  displayName: "Altoviz",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "altoviz_api_key",
      description:
        "Altoviz API key sent with the x-api-key header. Create or regenerate it in Altoviz Settings under API access: https://app.altoviz.com/go/settings/apis.",
    },
  ],
  homepageUrl: "https://altoviz.com/en/",
  actions: altovizActions,
};
