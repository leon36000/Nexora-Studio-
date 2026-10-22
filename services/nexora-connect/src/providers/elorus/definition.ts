import type { ProviderDefinition } from "../../core/types.ts";

import { elorusActions } from "./actions.ts";

const service = "elorus";

export const provider: ProviderDefinition = {
  service,
  displayName: "Elorus",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "elorus_api_key",
      description:
        "Elorus API key sent as Authorization: Token <token>. Find it in the Elorus web application under User Profile.",
      extraFields: [
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "1000000243015421",
          description:
            "The Elorus organization ID sent with the X-Elorus-Organization header. Use the organization you want this connection to operate on.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.elorus.com",
  actions: elorusActions,
};
