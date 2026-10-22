import type { ProviderDefinition } from "../../core/types.ts";

import { whoisfreaksActions } from "./actions.ts";

const service = "whoisfreaks";

export const provider: ProviderDefinition = {
  service,
  displayName: "WhoisFreaks",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WHOISFREAKS_API_KEY",
      description:
        "WhoisFreaks API key passed with the apiKey query parameter. Sign in to your dashboard to copy it from https://whoisfreaks.com/documentation/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://whoisfreaks.com",
  actions: whoisfreaksActions,
};
