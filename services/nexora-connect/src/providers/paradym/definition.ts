import type { ProviderDefinition } from "../../core/types.ts";

import { paradymActions } from "./actions.ts";

const service = "paradym";

export const provider: ProviderDefinition = {
  service,
  displayName: "Paradym",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API key",
      placeholder: "PARADYM_API_KEY",
      description:
        "Paradym API key sent in the X-Access-Token header. Create and manage API keys from the Paradym dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://paradym.id",
  actions: paradymActions,
};
