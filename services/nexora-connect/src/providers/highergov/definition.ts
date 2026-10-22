import type { ProviderDefinition } from "../../core/types.ts";

import { highergovActions } from "./actions.ts";

const service = "highergov";

export const provider: ProviderDefinition = {
  service,
  displayName: "HigherGov",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HIGHERGOV_API_KEY",
      description:
        "HigherGov API key sent as the api_key query parameter. Create or manage it from the API page in your HigherGov account: https://www.highergov.com/api-management/.",
    },
  ],
  homepageUrl: "https://www.highergov.com/",
  actions: highergovActions,
};
