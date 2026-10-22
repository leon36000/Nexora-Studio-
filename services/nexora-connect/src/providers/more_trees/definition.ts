import type { ProviderDefinition } from "../../core/types.ts";

import { moreTreesActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "more_trees",
  displayName: "More Trees",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Key",
      placeholder: "MORE_TREES_PUBLIC_API_KEY",
      description:
        "More Trees public API key. Find it under Settings > Account Settings at https://dashboard.moretrees.eco.",
      extraFields: [
        {
          key: "accountCode",
          label: "Account Code",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "TL14MD",
          description: "More Trees payment account code.",
        },
        {
          key: "publicValidationKey",
          label: "Public Validation Key",
          required: true,
          secret: true,
          inputType: "password",
          placeholder: "MORE_TREES_PUBLIC_VALIDATION_KEY",
          description: "More Trees public validation key used when listing planting projects.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.moretrees.eco",
  actions: moreTreesActions,
};
