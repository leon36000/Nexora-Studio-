import type { ProviderDefinition } from "../../core/types.ts";

import { drimifyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "drimify",
  displayName: "Drimify",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DRIMIFY_API_KEY",
      description:
        "Drimify API key sent with the X-AUTH-TOKEN header. Generate or view it from the API management page under My Account in your Drimify dashboard; see https://help.drimify.com/en/article/api-data-structure-1ykdmtj/.",
    },
  ],
  homepageUrl: "https://drimify.com",
  actions: drimifyActions,
};
