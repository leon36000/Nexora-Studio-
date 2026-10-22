import type { ProviderDefinition } from "../../core/types.ts";

import { hotjarActions } from "./actions.ts";

const service = "hotjar";

export const provider: ProviderDefinition = {
  service,
  displayName: "Hotjar",
  categories: ["Data", "Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "HOTJAR_CLIENT_ID",
          description:
            "The client ID from an administrator-generated Hotjar API credential. Create or view credentials on the Hotjar API settings page: https://insights.hotjar.com/settings/api.",
        },
        {
          key: "clientSecret",
          label: "Client Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "HOTJAR_CLIENT_SECRET",
          description:
            "The client secret paired with the Hotjar API credential. Generate it on the Hotjar API settings page and store it securely: https://insights.hotjar.com/settings/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.hotjar.com/",
  actions: hotjarActions,
};
