import type { ProviderDefinition } from "../../core/types.ts";

import { refinerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "refiner",
  displayName: "Refiner",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "refiner_api_key",
      description:
        "Refiner API key used with the Authorization Bearer header. Find it in Refiner under Integrations > Rest API: https://refiner.io/docs/api/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://refiner.io",
  actions: refinerActions,
};
