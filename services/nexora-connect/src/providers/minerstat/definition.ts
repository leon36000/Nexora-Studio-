import type { ProviderDefinition } from "../../core/types.ts";

import { minerstatActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "minerstat",
  displayName: "Minerstat",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MINERSTAT_API_KEY",
      description:
        "Minerstat developer API key sent in the X-API-Key header. Create or view keys in the official Developer Portal: https://api.minerstat.com/dev/login",
    },
  ],
  homepageUrl: "https://minerstat.com/",
  actions: minerstatActions,
};
