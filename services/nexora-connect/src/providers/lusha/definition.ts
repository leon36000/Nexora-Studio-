import type { ProviderDefinition } from "../../core/types.ts";

import { lushaActions } from "./actions.ts";

const service = "lusha";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lusha",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LUSHA_API_KEY",
      description:
        "Lusha API key sent with the api_key request header. Generate and manage it in the Lusha dashboard API page: https://dashboard.lusha.com/enrich/api.",
    },
  ],
  homepageUrl: "https://www.lusha.com",
  actions: lushaActions,
};
