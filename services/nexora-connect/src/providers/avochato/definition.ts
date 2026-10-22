import type { ProviderDefinition } from "../../core/types.ts";

import { avochatoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "avochato",
  displayName: "Avochato",
  categories: ["Communication", "Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "authId",
          label: "Auth ID",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "AVOCHATO_AUTH_ID",
          description: "Account-bound Auth ID generated under Settings > API Access.",
        },
        {
          key: "authSecret",
          label: "Auth Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "AVOCHATO_AUTH_SECRET",
          description: "Secret paired with the Avochato Auth ID.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.avochato.com/",
  actions: avochatoActions,
};
