import type { ProviderDefinition } from "../../core/types.ts";

import { zenventoryActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "zenventory",
  displayName: "Zenventory",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_API_KEY",
      description:
        "Zenventory API Key used as the HTTP Basic username. Generate it under Admin > Users > API Keys: https://app.zenventory.com/admin/users/api-keys",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "YOUR_API_SECRET",
          description: "Zenventory API Secret used as the HTTP Basic password.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.zenventory.com",
  actions: zenventoryActions,
};
