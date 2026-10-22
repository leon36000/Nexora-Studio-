import type { ProviderDefinition } from "../../core/types.ts";

import { prospeoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "prospeo",
  displayName: "Prospeo",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROSPEO_API_KEY",
      description:
        "Prospeo API key used with the X-KEY header. Create or copy it from the Prospeo application account settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://prospeo.io",
  actions: prospeoActions,
};
