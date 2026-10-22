import type { ProviderDefinition } from "../../core/types.ts";

import { cannyActions } from "./actions.ts";

const service = "canny";

export const provider: ProviderDefinition = {
  service,
  displayName: "Canny",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "canny_secret_api_key",
      description: "Canny secret API key sent as the apiKey POST parameter. Find it in your Canny company settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://canny.io",
  actions: cannyActions,
};
