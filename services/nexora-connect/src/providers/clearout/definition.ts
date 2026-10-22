import type { ProviderDefinition } from "../../core/types.ts";

import { clearoutActions } from "./actions.ts";

const service = "clearout";

export const provider: ProviderDefinition = {
  service,
  displayName: "Clearout",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "clearout_api_token",
      description:
        "Clearout API token used with the Authorization Bearer header. Create it from the Developer page in your Clearout dashboard: https://docs.clearout.io/api-overview.html.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.clearout.io/v2",
          description:
            "Optional Clearout API base URL. Only HTTPS Clearout-owned hosts are accepted; defaults to https://api.clearout.io/v2.",
        },
      ],
    },
  ],
  homepageUrl: "https://clearout.io",
  actions: clearoutActions,
};
