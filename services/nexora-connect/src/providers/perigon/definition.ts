import type { ProviderDefinition } from "../../core/types.ts";

import { perigonActions } from "./actions.ts";

const service = "perigon";

export const provider: ProviderDefinition = {
  service,
  displayName: "Perigon",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PERIGON_API_KEY",
      description:
        "Perigon API key sent with the x-api-key request header. Create an account and manage API keys from the developer section at https://www.perigon.io/dev.",
    },
  ],
  homepageUrl: "https://perigon.io",
  actions: perigonActions,
};
