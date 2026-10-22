import type { ProviderDefinition } from "../../core/types.ts";

import { buildiumActions } from "./actions.ts";

const service = "buildium";

export const provider: ProviderDefinition = {
  service,
  displayName: "Buildium",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Client Secret",
      placeholder: "BUILDIUM_CLIENT_SECRET",
      description:
        "Buildium API client secret sent with the x-buildium-client-secret header. Create or view API keys in your Buildium account under Settings > API Keys: https://developer.buildium.com/.",
      extraFields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "BUILDIUM_CLIENT_ID",
          description:
            "Buildium API client ID sent with the x-buildium-client-id header. Find it with the client secret in your Buildium account API Keys page: https://developer.buildium.com/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.buildium.com",
  actions: buildiumActions,
};
