import type { ProviderDefinition } from "../../core/types.ts";

import { realPhoneValidationActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "realphonevalidation",
  displayName: "RealPhoneValidation",
  categories: ["Communication", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "REALPHONEVALIDATION_API_TOKEN",
      description:
        "RealPhoneValidation API token passed as the token query parameter. Get or regenerate it from the validation page inside your RealValidation account: https://my.realvalidation.com/.",
    },
  ],
  homepageUrl: "https://realphonevalidation.com",
  actions: realPhoneValidationActions,
};
