import type { ProviderDefinition } from "../../core/types.ts";

import { opencageActions } from "./actions.ts";

const service = "opencage";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenCage",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OPENCAGE_API_KEY",
      description:
        "OpenCage API key sent as the key query parameter. Find it in the Geocoding tab of your account dashboard: https://opencagedata.com/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://opencagedata.com",
  actions: opencageActions,
};
