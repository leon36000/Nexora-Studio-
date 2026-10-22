import type { ProviderDefinition } from "../../core/types.ts";

import { gatherupActions } from "./actions.ts";

const credentialHelpUrl = "https://help.gatherup.com/s/article/GatherUp-API-Client-ID-Private-Key-and-Bearer-Token";

export const provider: ProviderDefinition = {
  service: "gatherup",
  displayName: "GatherUp",
  categories: ["Marketing", "Data"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "apiKey",
          label: "Bearer Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "GATHERUP_BEARER_TOKEN",
          description: `GatherUp Bearer token. Obtain it from the account owner details: ${credentialHelpUrl}.`,
        },
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "GATHERUP_CLIENT_ID",
          description: `GatherUp client ID paired with the Bearer token: ${credentialHelpUrl}.`,
        },
      ],
    },
  ],
  homepageUrl: "https://gatherup.com/",
  actions: gatherupActions,
};
