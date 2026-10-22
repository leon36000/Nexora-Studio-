import type { ProviderDefinition } from "../../core/types.ts";

import { yGyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "y_gy",
  displayName: "Y.GY",
  description: "Create and manage Y.GY short links, QR codes, and routing settings.",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "y_gy_api_key",
      description:
        "Y.GY API key sent with the api-key header. Create one in Dashboard > My Account > API Keys as documented at https://app.y.gy/docs/api-docs/authenticate.",
    },
  ],
  homepageUrl: "https://app.y.gy",
  actions: yGyActions,
};
