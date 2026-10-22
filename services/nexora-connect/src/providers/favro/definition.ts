import type { ProviderDefinition } from "../../core/types.ts";

import { favroActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "favro",
  displayName: "Favro",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "FAVRO_API_TOKEN",
      description:
        "Favro API token used as the Basic Auth password. Generate a token from your Favro user profile: https://favro.com/developer/#tokens",
      extraFields: [
        {
          key: "email",
          label: "Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "user@example.com",
          description: "Favro account email used as the Basic Auth username.",
        },
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "zk4CJpg5uozhL4R2W",
          description: "Favro organization ID used to route API requests.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.favro.com/",
  actions: favroActions,
};
