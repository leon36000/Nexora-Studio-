import type { ProviderDefinition } from "../../core/types.ts";

import { devtoActions } from "./actions.ts";

const service = "devto";

export const provider: ProviderDefinition = {
  service,
  displayName: "Dev.to",
  categories: ["Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "devto_api_key",
      description:
        "DEV API key sent with the api-key header. Generate one from your DEV settings page: https://developers.forem.com/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://dev.to",
  actions: devtoActions,
};
