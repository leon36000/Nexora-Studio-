import type { ProviderDefinition } from "../../core/types.ts";

import { amiliaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "amilia",
  displayName: "Amilia",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "JWT Token",
      placeholder: "AMILIA_JWT_TOKEN",
      description:
        "One-year Amilia JWT sent as a Bearer token. Obtain it by calling POST https://app.amilia.com/api/V3/authenticate with Basic authentication for a dedicated Amilia API user: https://app.amilia.com/apidocs/Index.html#authentication",
      extraFields: [
        {
          key: "organization",
          label: "Organization Identifier",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "forest-explorers",
          description:
            "Amilia organization number or URL identifier shown in the Amilia store URL and under the organization's account options.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.amilia.com/",
  actions: amiliaActions,
};
