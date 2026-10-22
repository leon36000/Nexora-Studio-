import type { ProviderDefinition } from "../../core/types.ts";

import { zenserpActions } from "./actions.ts";

const service = "zenserp";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zenserp",
  categories: ["Data", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZENSERP_API_KEY",
      description:
        "Zenserp API key sent with the apikey header. Create or view it in the Zenserp documentation portal after signing in: https://app.zenserp.com/documentation.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://zenserp.com",
  actions: zenserpActions,
};
