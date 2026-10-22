import type { ProviderDefinition } from "../../core/types.ts";

import { demioActions } from "./actions.ts";

const credentialHelpUrl = "https://help.demio.com/en/articles/3527489-zapier-setup";

export const provider: ProviderDefinition = {
  service: "demio",
  displayName: "Demio",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DEMIO_API_KEY",
      description: `Demio API Key sent with the Api-Key header. Account owners can copy it from Settings > API: ${credentialHelpUrl}.`,
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "DEMIO_API_SECRET",
          description: `Demio API Secret sent with the Api-Secret header. Account owners can copy or regenerate it from Settings > API: ${credentialHelpUrl}.`,
        },
      ],
    },
  ],
  homepageUrl: "https://www.demio.com",
  actions: demioActions,
};
