import type { ProviderDefinition } from "../../core/types.ts";

import { highLevelActions } from "./actions.ts";

const service = "high_level";

export const provider: ProviderDefinition = {
  service,
  displayName: "HighLevel",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private Integration Token",
      placeholder: "high_level_private_integration_token",
      description:
        "HighLevel Private Integration token sent as a bearer token. Create it from HighLevel agency settings under Private Integrations: https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken",
      extraFields: [
        {
          key: "locationId",
          label: "Location ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "high_level_location_id",
          description: "The HighLevel sub-account or location ID used as the default location for contact actions.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gohighlevel.com",
  actions: highLevelActions,
};
