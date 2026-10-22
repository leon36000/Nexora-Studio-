import type { ProviderDefinition } from "../../core/types.ts";

import { genderApiActions } from "./actions.ts";

const service = "gender_api";

/**
 * Gender-API.com gender inference and account statistics provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gender-API.com",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "GENDER_API_TOKEN",
      description:
        "Gender-API.com v2 API token sent as a Bearer token. Create or manage tokens in your Gender-API.com account: https://gender-api.com/en/account/auth-tokens",
    },
  ],
  homepageUrl: "https://gender-api.com/",
  actions: genderApiActions,
};
