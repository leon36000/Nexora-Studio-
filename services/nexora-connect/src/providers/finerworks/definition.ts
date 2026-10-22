import type { ProviderDefinition } from "../../core/types.ts";

import { finerworksActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "finerworks",
  displayName: "FinerWorks",
  categories: ["Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Web API Key",
      placeholder: "FINERWORKS_WEB_API_KEY",
      description: "FinerWorks web API key. Find it at https://v2.api.finerworks.com/Documentation",
      extraFields: [
        {
          key: "appKey",
          label: "App Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "FINERWORKS_APP_KEY",
          description: "FinerWorks app key sent with the app_key header.",
        },
      ],
    },
  ],
  homepageUrl: "https://finerworks.com/",
  actions: finerworksActions,
};
