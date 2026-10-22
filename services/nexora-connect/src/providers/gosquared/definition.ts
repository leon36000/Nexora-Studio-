import type { ProviderDefinition } from "../../core/types.ts";

import { gosquaredActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "gosquared",
  displayName: "GoSquared",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GOSQUARED_API_KEY",
      description:
        "GoSquared API key passed as the api_key query parameter. Create or manage API keys in API Access settings: https://www.gosquared.com/settings/api.",
      extraFields: [
        {
          key: "siteToken",
          label: "Site Token",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "GSN-106863-S",
          description:
            "GoSquared site_token for the default project. Find it in Settings > Current Project > General: https://www.gosquared.com/setup/general.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gosquared.com/",
  actions: gosquaredActions,
};
