import type { ProviderDefinition } from "../../core/types.ts";

import { wizaActions } from "./actions.ts";

const service = "wiza";

export const provider: ProviderDefinition = {
  service,
  displayName: "Wiza",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "wiza_api_key",
      description:
        "Wiza API key sent as a Bearer token. Generate it in Wiza API documentation or account access settings: https://docs.wiza.co/account-access/generate-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://wiza.co",
  actions: wizaActions,
};
