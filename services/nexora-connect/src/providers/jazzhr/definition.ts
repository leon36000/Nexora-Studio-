import type { ProviderDefinition } from "../../core/types.ts";

import { jazzhrActions } from "./actions.ts";

const service = "jazzhr";

export const provider: ProviderDefinition = {
  service,
  displayName: "JazzHR",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_JAZZHR_API_KEY",
      description:
        "JazzHR API key sent as the apikey query parameter. Find it in your JazzHR account under Settings > Integrations: https://app.jazz.co/app/settings/integrations.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.jazzhr.com",
  actions: jazzhrActions,
};
