import type { ProviderDefinition } from "../../core/types.ts";

import { shodanActions } from "./actions.ts";

const service = "shodan";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shodan",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHODAN_API_KEY",
      description:
        "Shodan API key passed as the key query parameter. Get it from your account page at https://account.shodan.io.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.shodan.io",
  actions: shodanActions,
};
