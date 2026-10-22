import type { ProviderDefinition } from "../../core/types.ts";

import { zApiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "z_api",
  displayName: "Z-API",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Client Token",
      placeholder: "Z_API_CLIENT_TOKEN",
      description: "Z-API account security token. Create it from https://developer.z-api.io/en/security/client-token.",
      extraFields: [
        {
          key: "instanceId",
          label: "Instance ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Z_API_INSTANCE_ID",
        },
        {
          key: "instanceToken",
          label: "Instance Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Z_API_INSTANCE_TOKEN",
        },
      ],
    },
  ],
  homepageUrl: "https://www.z-api.io",
  actions: zApiActions,
};
