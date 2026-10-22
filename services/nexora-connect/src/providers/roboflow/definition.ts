import type { ProviderDefinition } from "../../core/types.ts";

import { roboflowActions } from "./actions.ts";

const service = "roboflow";

export const provider: ProviderDefinition = {
  service,
  displayName: "Roboflow",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ROBOFLOW_API_KEY",
      description:
        "Roboflow API key sent as the api_key query parameter. Get it from Roboflow Settings under API Keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://roboflow.com/",
  actions: roboflowActions,
};
