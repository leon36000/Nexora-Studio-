import type { ProviderDefinition } from "../../core/types.ts";

import { gangtiseActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "gangtise",
  displayName: "Gangtise",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Key",
      placeholder: "GANGTISE_ACCESS_KEY",
      description:
        "Gangtise Access Key. Create an account and get both keys under My Account > Account List at https://open-platform.gangtise.com/.",
      extraFields: [
        {
          key: "secretKey",
          label: "Secret Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "GANGTISE_SECRET_KEY",
          description: "Secret Key paired with the Gangtise Access Key.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gangtise.com",
  actions: gangtiseActions,
};
