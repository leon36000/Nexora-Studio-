import type { ProviderDefinition } from "../../core/types.ts";

import { expofpActions } from "./actions.ts";

const service = "expofp";

export const provider: ProviderDefinition = {
  service,
  displayName: "ExpoFP",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "EXPOFP_API_TOKEN",
      description:
        "ExpoFP API token sent as the token field in every JSON request body. Get it from your ExpoFP Profile page: https://expofp.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://expofp.com",
  actions: expofpActions,
};
